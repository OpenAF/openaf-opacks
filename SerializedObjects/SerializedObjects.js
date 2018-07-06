function UnSerializeObject(aLob){
    var is = af.fromBytes2InputStream(aLob);
    var ois  = new java.io.ObjectInputStream( is );
    var res= ois.readObject();
    return res;
}

function SerializeObject2ByteArray(aObject)
{
    var os = new java.io.ByteArrayOutputStream();
    var oos = new java.io.ObjectOutputStream(os);
    oos.writeObject(aObject);
    oos.flush();
    oos.close();
    os.close();
    return os.toByteArray();
}


function SerializeObject2File(aObject,aFile)
{
    var fos = new java.io.FileOutputStream(aFile);
    var oos = new java.io.ObjectOutputStream(fos);
    oos.writeObject(aObject);
    oos.flush();
    oos.close();
    fos.close();
}
