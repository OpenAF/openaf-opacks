"""Independent generated Python peer. Run via tests/interop.sh."""
import sys
from concurrent import futures
import grpc
from grpc_reflection.v1alpha import reflection, reflection_pb2, reflection_pb2_grpc
import hello_pb2 as messages
import hello_pb2_grpc as services

class ReflectionAuth(grpc.ServerInterceptor):
    def intercept_service(self, continuation, details):
        if details.method.startswith('/grpc.reflection.') and ('x-reflect', 'allowed') not in details.invocation_metadata:
            def deny(requests, context):
                context.abort(grpc.StatusCode.UNAUTHENTICATED, 'reflection metadata required')
            return grpc.stream_stream_rpc_method_handler(deny)
        return continuation(details)

class Greeter(services.GreeterServicer):
    def Echo(self, request, context):
        return request

    def Watch(self, request, context):
        for i in range(request.count or 3):
            yield messages.Message(name=str(i), data=request.data)
    def Collect(self, requests, context):
        return messages.Message(name=','.join(r.name for r in requests))
    def Chat(self, requests, context):
        for request in requests:
            yield request

if sys.argv[1] == 'server':
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=2), interceptors=[ReflectionAuth()])
    services.add_GreeterServicer_to_server(Greeter(), server)
    reflection.enable_server_reflection(('demo.Greeter', reflection.SERVICE_NAME), server)
    port = server.add_insecure_port('127.0.0.1:0')
    server.start()
    with open(sys.argv[2], 'w') as output:
        output.write(str(port))
    server.wait_for_termination()
else:
    with grpc.insecure_channel('localhost:' + sys.argv[2]) as channel:
        reply = services.GreeterStub(channel).Echo(messages.Message(name='Python', count=9223372036854775807, data=b'abc'), timeout=5)
        assert reply.name == 'Python' and reply.count == 9223372036854775807 and reply.data == b'abc'
        reflected = reflection_pb2_grpc.ServerReflectionStub(channel)
        requests = iter([
            reflection_pb2.ServerReflectionRequest(list_services=''),
            reflection_pb2.ServerReflectionRequest(file_containing_symbol='demo.Greeter'),
        ])
        replies = list(reflected.ServerReflectionInfo(requests, timeout=5))
        assert any(s.name == 'demo.Greeter' for s in replies[0].list_services_response.service)
        assert replies[1].file_descriptor_response.file_descriptor_proto
        print('PASS: generated Python reflection client -> OpenAF server (v1alpha)')
        stub = services.GreeterStub(channel)
        assert [r.name for r in stub.Watch(messages.Message(count=3), timeout=5)] == ['0', '1', '2']
        assert stub.Collect(iter([messages.Message(name='a'), messages.Message(name='b')]), timeout=5).name == 'a,b'
        assert [r.name for r in stub.Chat(iter([messages.Message(name=str(i)) for i in range(10)]), timeout=5)] == [str(i) for i in range(10)]
        print('PASS: generated Python client -> OpenAF server (unary and all streaming types)')
