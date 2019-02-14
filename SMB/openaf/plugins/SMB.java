package openaf.plugins;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.UnknownHostException;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Properties;

import org.apache.commons.io.IOUtils;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Undefined;
import org.mozilla.javascript.annotations.JSConstructor;
import org.mozilla.javascript.annotations.JSFunction;

import jcifs.smb.NtlmPasswordAuthenticator;
import jcifs.smb.SmbException;
import jcifs.smb.SmbFile;
import jcifs.smb.SmbFileInputStream;
import jcifs.smb.SmbFileOutputStream;
import jcifs.config.BaseConfiguration;
import jcifs.CIFSContext;
import jcifs.context.CIFSContextWrapper;
import jcifs.config.PropertyConfiguration;
import jcifs.context.BaseContext;

import openaf.AFCmdBase;

/**
 * OpenAF plugin to access remote Windows/Samba shares using jcifs
 * 
 * @author Nuno Aguiar
 *
 */
public class SMB extends ScriptableObject {

	private static final long serialVersionUID = 2794123619215765456L;
	//protected NtlmPasswordAuthentication context, npa;
	protected SmbFile smbf;
	protected String aDomain, aUser, aPassword;
	protected BaseConfiguration config;
	protected CIFSContext context;
	
	@Override
	public String getClassName() {
		return "SMB";
	}

	@JSFunction
	public Object getConfig() {
		return config;
	}
	
	/**
	 * <odoc>
	 * <key>SMB.SMB(aShareURL, aDomain, aUser, aPassword) : SMB</key>
	 * Initializes a SMB object to access the aShareURL on aDomain with aUser and aPassword. Keep in mind to always add
	 * a "/" on the end of URLs targeting a folder.\
	 * \
	 * Example:\
	 *   var smb = new SMB("smb://a.server/shares/", "mydomain", "user", "...");\
	 * \
	 * </odoc>
	 */
	@JSConstructor
	public void newSMB(String shareURL, String aDomain, String aUser, String aPassword) throws IOException, InstantiationException, IllegalAccessException {
		//npa = new NtlmPasswordAuthentication(context, aDomain, AFCmdBase.afc.dIP(aUser), AFCmdBase.afc.dIP(aPassword));
		this.aDomain = aDomain; this.aUser = aUser; this.aPassword = aPassword;

		if (shareURL.indexOf("smb://") == 0) {
			shareURL = "smb://" + aDomain + ";" + URLEncoder.encode(AFCmdBase.afc.dIP(aUser), "UTF-8") + ":" + URLEncoder.encode(AFCmdBase.afc.dIP(aPassword), "UTF-8") + "@" + shareURL.substring(shareURL.indexOf("smb://") + 6);
			System.out.println(shareURL);
		}
		//config = new BaseConfiguration(true);
		context = new BaseContext(new PropertyConfiguration(System.getProperties()));
		context = context.withCredentials(new jcifs.smb.NtlmPasswordAuthenticator(aDomain, AFCmdBase.afc.dIP(aUser), AFCmdBase.afc.dIP(aPassword)));
		smbf = new SmbFile(shareURL, context);
		smbf.connect();
	}
	
	/**
	 * <odoc>
	 * <key>SMB.getSmbFile() : SmbFile</key>
	 * Returns the internal SmbFile object.
	 * </odoc>
	 */
	@JSFunction
	public Object getSmbFile() {
		return smbf;
	}
	
	/**
	 * <odoc>
	 * <key>SMB.listFiles(aPath) : Map</key>
	 * Returns a map with a files array containing filename, filepath, size, permissions, lastModified, createTime, isDirectory
	 * and isFile properties per each entry on aPath. If no aPath is provided it will default to the aShareURL used to instantiate
	 * the SMB object.
	 * </odoc>
	 */
	@JSFunction
	public Object listFiles(Object path) throws IOException {
		Scriptable no = (Scriptable) AFCmdBase.jse.newObject(AFCmdBase.jse.getGlobalscope());
		ArrayList<Scriptable> list = new ArrayList<Scriptable>(); 
		
		SmbFile[] ss;
		if (path != null && !(path instanceof Undefined)) {
			SmbFile sf = new SmbFile((String) path, context);
			sf.connect();
			ss = sf.listFiles();
		} else {
			ss = smbf.listFiles();
		}
		
		for(int i = 0; i < ss.length; i++) {
			Scriptable record = (Scriptable) AFCmdBase.jse.newObject(no);
			record.put("filename", record, ss[i].getName());
			record.put("filepath", record, ss[i].getParent() + ss[i].getName());
			record.put("size", record, ss[i].length());
			record.put("permissions", record, ss[i].getPermission().getName());
			record.put("lastModified", record, ss[i].getLastModified());
			record.put("createTime", record, ss[i].createTime());
			record.put("isDirectory", record, ss[i].isDirectory());
			record.put("isFile", record, ss[i].isFile());
			list.add(record);
		}
		
		no.put("files", no, AFCmdBase.jse.newArray(no, list.toArray()));
		return no;
	}
	
	/**
	 * <odoc>
	 * <key>SMB.getFile(aSourceURL, aTarget) : Number</key>
	 * Will retrieve aSourceURL file to the local filesystem aTarget. Returns the number of characters copied.
	 * </odoc>
	 */
	@JSFunction
	public Object getFile(String aSource, String aTarget) throws IOException {
		SmbFile f = new SmbFile(aSource, context);
		SmbFileInputStream sfis = new SmbFileInputStream(f);
		FileOutputStream fw = new FileOutputStream(aTarget);
		long res = IOUtils.copyLarge(sfis, fw);
		/*IOUtils.closeQuietly(fw);
		IOUtils.closeQuietly(sfis);*/
		fw.close();
		sfis.close();
		return res;
	}
	
	/**
	 * <odoc>
	 * <key>SMB.putFile(aSource, aTargetURL) : Number</key>
	 * Will copy aSource file from the local filesystem to aTargetURL. Returns the number of characters copied.
	 * </odoc>
	 */
	@JSFunction
	public Object putFile(String aSource, String aTarget) throws FileNotFoundException, IOException {
		SmbFile f = new SmbFile(aTarget, context);
		SmbFileOutputStream sfos = new SmbFileOutputStream(f);
		FileInputStream fis = new FileInputStream(aSource);
		long res = IOUtils.copyLarge(fis, sfos);
		/*IOUtils.closeQuietly(sfos);
		IOUtils.closeQuietly(fis);*/
		sfos.close();
		fis.close();
		return res;
	}
	
	/**
	 * <odoc>
	 * <key>SMB.getInputStream(aSourceURL) : SmbFileInputStream</key>
	 * Returns a java InputStream to retrieve from aSourceURL.
	 * </odoc>
	 */
	@JSFunction
	public Object getInputStream(String aSource) throws MalformedURLException, SmbException, UnknownHostException {
		SmbFile f = new SmbFile(aSource, context);
		SmbFileInputStream sfis = new SmbFileInputStream(f);
		return sfis;
	}
	
	/**
	 * <odoc>
	 * <key>SMB.getFileBytes(aSourceURL) : JavaByteArray</key>
	 * Returns an array of bytes from the transfer of aSourceURL.
	 * </odoc>
	 */
	@JSFunction
	public Object getFileBytes(String aSource) throws IOException {
		SmbFile f = new SmbFile(aSource, context);
		SmbFileInputStream sfis = new SmbFileInputStream(f);
		byte[] res = IOUtils.toByteArray(sfis);
		//IOUtils.closeQuietly(sfis);
		sfis.close();
		return res;
	}
	
	/**
	 * <odoc>
	 * <key>SMB.writeFileBytes(aTargetURL, arrayOfBytes, append)</key>
	 * Will write an arrayOfBytes to the aTargetURL. The contents will be append if append = true.
	 * </odoc>
	 */
	@JSFunction
	public void writeFileBytes(String aTarget, Object ba, boolean append) throws IOException {
		SmbFile f = new SmbFile(aTarget, context);
		SmbFileOutputStream sfos = new SmbFileOutputStream(f, append);
		IOUtils.write((byte[]) ba, sfos);
		//IOUtils.closeQuietly(sfos);
		sfos.close();
	}
	
	/**
	 * <odoc>
	 * <key>SMB.writeFileStream(aTargetURL, javaOutputStream, append)</key>
	 * Will write a javaOutputStream to the aTargetURL. The contents will be append if append = true.
	 * </odoc>
	 */
	@JSFunction
	public void writeFileStream(String aTarget, Object stream, boolean append) throws IOException {
		SmbFile f = new SmbFile(aTarget, context);
		SmbFileOutputStream sfos = new SmbFileOutputStream(f, append);
		IOUtils.copyLarge((InputStream) stream, sfos);
		//IOUtils.closeQuietly(sfos);
		sfos.close();
	}

	/**
	 * <odoc>
	 * <key>SMB.rm(aTargetURL)</key>
	 * Tries to delete aTargetURL.
	 * </odoc>
	 */
	@JSFunction
	public void rm(String aTarget) throws MalformedURLException, SmbException {
		SmbFile f = new SmbFile(aTarget, context);
		f.delete();
	}
}
