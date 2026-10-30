"""Actual oafp-engine subprocess tests using generated Python gRPC peers."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
from concurrent import futures

import grpc
from grpc_tools import protoc

ROOT = Path(__file__).resolve().parent.parent
JAR = os.environ.get('GRPC_OPENAF_JAR')
if not JAR:
    JAR = subprocess.check_output(['openaf', '-c', 'print(getOpenAFJar())'], text=True).strip()
COMMAND = ['java', '-jar', JAR, '-f', 'tests/oafp-command.js']

def start(params, **kwargs):
    env = dict(os.environ, GRPC_OAFP_PARAMS=json.dumps(dict(libs='grpc', **params)))
    return subprocess.Popen(COMMAND, cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, **kwargs)

def finish(process, timeout=40):
    output, error = process.communicate(timeout=timeout)
    assert process.returncode == 0, (output, error)
    assert b'\xe2\x94\x82' not in output, (output, error)
    return output

def run(params, data=None):
    process = start(params, stdin=subprocess.PIPE)
    output, error = process.communicate(data, timeout=40)
    assert process.returncode == 0, (output, error)
    return output

with tempfile.TemporaryDirectory(prefix='grpc-oafp-') as temporary:
    path = Path(temporary)
    assert protoc.main(['protoc', '-I' + str(ROOT / 'tests'), '--python_out=' + temporary,
                        '--grpc_python_out=' + temporary, str(ROOT / 'tests/hello.proto')]) == 0
    sys.path.insert(0, temporary)
    import hello_pb2 as messages
    import hello_pb2_grpc as services

    class Peer(services.GreeterServicer):
        def Echo(self, request, context): return request
        def Watch(self, request, context):
            for i in range(request.count or 2): yield messages.Message(name=str(i))
        def Collect(self, requests, context): return messages.Message(name=','.join(r.name for r in requests))
        def Chat(self, requests, context): yield from requests

    peer = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
    services.add_GreeterServicer_to_server(Peer(), peer)
    port = peer.add_insecure_port('127.0.0.1:0')
    peer.start()
    schema = dict(descriptorSet=str(ROOT / 'tests/hello.protoset'), plaintext=True)
    try:
        for method, request, expected in [
            ('Echo', dict(name='echo'), ['echo']),
            ('Watch', dict(count='3'), ['0', '1', '2']),
            ('Collect', [dict(name='a'), dict(name='b')], ['a,b']),
            ('Chat', [dict(name='a'), dict(name='b')], ['a', 'b']),
        ]:
            params = dict(grpcoptions=dict(schema, target='localhost:' + str(port)), grpcmethod='demo.Greeter/' + method)
            result = run(dict(params, **{'in':'grpc', 'data':'', 'out':'ndjson', 'grpcrequest': request}))
            assert [json.loads(line)['name'] for line in result.splitlines()] == expected, result
            result = run(dict(params, **{'in':'json', 'data':json.dumps(request), 'out':'grpc'}))
            assert [r['name'] for r in json.loads(result)['responses']] == expected, result
    finally:
        peer.stop(0).wait()

    original = dict(name='binary', count='9223372036854775807', data='AAEC')
    binary = run({'in':'json', 'data':json.dumps(original), 'out':'protobuf', 'grpcoptions':schema, 'protobufmessage':'demo.Message'})
    assert messages.Message.FromString(binary).count == 9223372036854775807
    written = run({'in':'json','data':json.dumps(original),'out':'protobuf','outfile':str(path/'written.pb'),'grpcoptions':schema,'protobufmessage':'demo.Message'})
    assert written == b''
    assert (path/'written.pb').read_bytes() == binary
    (path / 'message.pb').write_bytes(binary)
    decoded = run({'file':str(path/'message.pb'), 'out':'json', 'grpcoptions':schema, 'protobufmessage':'demo.Message'})
    assert json.loads(decoded) == original, decoded
    decoded = run({'in':'protobuf','data':'','out':'json','grpcoptions':schema,'protobufmessage':'demo.Message'}, binary)
    assert json.loads(decoded) == original, decoded
    decoded = run({'in':'protobuf','data':'','protobufcmd':'cat ' + str(path/'message.pb'),'out':'json','grpcoptions':schema,'protobufmessage':'demo.Message'})
    assert json.loads(decoded) == original, decoded
    schema_map = json.loads(run({'file':'tests/hello.proto','out':'json'}))
    source = run({'in':'json','data':json.dumps(schema_map),'out':'proto'})
    assert b'message Message' in source

    for method in ['Echo','Watch','Collect','Chat']:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
        response = [dict(name='first'),dict(name='second')] if method == 'Watch' else dict(name='reply')
        process = start({'in':'grpc','data':'','out':'ndjson','grpcmode':'server',
                         'grpcmethod':'demo.Greeter/'+method, 'grpcoptions':dict(schema,port=port,host='127.0.0.1'),
                         'grpcresponse':response,'grpcduration':4000})
        try:
            with grpc.insecure_channel('localhost:' + str(port)) as channel:
                grpc.channel_ready_future(channel).result(timeout=15)
                stub = services.GreeterStub(channel)
                if method == 'Echo': assert stub.Echo(messages.Message(name='in'),timeout=5).name == 'reply'
                elif method == 'Watch': assert [r.name for r in stub.Watch(messages.Message(name='in'),timeout=5)] == ['first','second']
                elif method == 'Collect': assert stub.Collect(iter([messages.Message(name='in')]),timeout=5).name == 'reply'
                else: assert [r.name for r in stub.Chat(iter([messages.Message(name='in')]),timeout=5)] == ['reply']
            output = finish(process)
            assert [json.loads(line)['name'] for line in output.splitlines()] == ['in'], output
        finally:
            if process.poll() is None: process.kill(); process.communicate()
    # Count bounds and interrupt cleanup are independent of the duration tests above.
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
    base_listener = {'in':'grpc','data':'','out':'ndjson','grpcmode':'server',
                     'grpcmethod':'demo.Greeter/Echo','grpcoptions':dict(schema,port=port,host='127.0.0.1'),
                     'grpcresponse':dict(name='reply')}
    process = start(dict(base_listener, grpcmaxrequests=1))
    try:
        with grpc.insecure_channel('localhost:' + str(port)) as channel:
            grpc.channel_ready_future(channel).result(timeout=15)
            assert services.GreeterStub(channel).Echo(messages.Message(name='bounded'),timeout=5).name == 'reply'
        assert json.loads(finish(process))['name'] == 'bounded'
    finally:
        if process.poll() is None: process.kill(); process.communicate()
    process = start(base_listener)
    try:
        with grpc.insecure_channel('localhost:' + str(port)) as channel:
            grpc.channel_ready_future(channel).result(timeout=15)
        process.terminate()
        process.communicate(timeout=15)
        with socket.socket() as sock:
            sock.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
            sock.bind(('127.0.0.1',port))
    finally:
        if process.poll() is None: process.kill(); process.communicate()
    process = start(dict(base_listener, grpcresponse={'unknown':1}))
    output,error = process.communicate(timeout=15)
    assert process.returncode != 0, (output,error)
    with socket.socket() as sock:
        sock.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
        sock.bind(('127.0.0.1',port))
    print('PASS: actual oafp schema/binary conversion, all client and listener RPC patterns')
