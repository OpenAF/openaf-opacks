package openaf.plugins;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.List;

import javax.print.DocFlavor.STRING;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date; 
import java.util.GregorianCalendar;
import java.util.HashMap;
import java.util.Iterator;
import java.lang.String;

import org.apache.poi.EncryptedDocumentException;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.CellValue;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Name;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.mozilla.javascript.ConsString;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.NativeArray;
import org.mozilla.javascript.NativeObject;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Undefined;
import org.mozilla.javascript.annotations.JSConstructor;
import org.mozilla.javascript.annotations.JSFunction;

import openaf.AFCmdBase;

/**
 * XLS plugin
 * 
 * @author Nuno Aguiar
 * 
 */
public class XLS extends ScriptableObject {
	/**
	 * 
	 */
	private static final long serialVersionUID = -9058684071530344845L;
	protected static String dataformat = "yyyy-mm-dd hh:mm:ss";
	protected static String longformat = "0";
	protected Workbook wbook;
	protected FormulaEvaluator evaluator;
	protected String encoding = null;
	protected File aFile = null;
	protected Boolean read_only = false;
	protected HashMap<Object, CellStyle> dataStyleCache = new HashMap<Object, CellStyle>();
	protected HashMap<Object, CellStyle> longStyleCache = new HashMap<Object, CellStyle>();

	protected enum TableType {
		HORIZONTAL, VERTICAL, CUSTOM;
	}

	@Override
	public String getClassName() {
		return "XLS";
	}

	/**
	 * <odoc>
	 * <key>XLS.getEncoding() : String</key>
	 * Retrieves the current encoding used internally to convert strings (null if no conversion is performed)
	 * </odoc>
	 */
	@JSFunction
	public String getEncoding() {
		return this.encoding;
	}

	/**
	 * <odoc>
	 * <key>XLS.setEncoding(anEncoding)</key>
	 * Sets anEncoding (e.g. "UTF-8", "cp850", etc...) to be used internally to convert strings (set to null to disable
	 * any conversion).
	 * </odoc>
	 */
	@JSFunction
	public void setEncoding(String enc) {
		this.encoding = enc;
	}

	/**
	 * <odoc>
	 * <key>XLS.toNumber(aName) : Number</key>
	 * Converts a column letter combination into the corresponding column number. Example:\
	 * \
	 * var xls = new XLS();\
	 * xls.toNumber("AF"); // 32\
	 * \
	 * </odoc>
	 */
	@JSFunction
	public static int toNumber(String name) {
		int number = 0;
		for (int i = 0; i < name.length(); i++) {
			number = number * 26 + (name.charAt(i) - ('A' - 1));
		}
		return number;
	}

	/**
	 * <odoc>
	 * <key>XLS.toName(aNumber) : String</key>
	 * Converts a column number into the corresponding column letter combination. Example:\
	 * \
	 * var xls = new XLS();\
	 * xls.toName(32); // AF\
	 * \
	 * </odoc>
	 */
	@JSFunction
	public static String toName(int number) {
		StringBuilder sb = new StringBuilder();
		while (number-- > 0) {
			sb.append((char) ('A' + (number % 26)));
			number /= 26;
		}
		return sb.reverse().toString();
	}

	/**
	 * 
	 * @param sy
	 * @return
	 */
	protected static int translateObject(Object sy) {
		int y;

		if (sy instanceof Integer) {
			return ((Integer) sy).intValue();
		}

		if (sy instanceof Double) {
			return ((Double) sy).intValue();
		}

		y = toNumber((String) sy);

		return y;
	}

	/**
	 * 
	 * @param type
	 * @return
	 */
	protected static String translateType(Cell cell) {
		@SuppressWarnings("deprecation")
		CellType c = cell.getCellType();
		if (c == CellType.BLANK) return "BLANK";
		if (c == CellType.BOOLEAN) return "BOOLEAN";
		if (c == CellType.ERROR) return "ERROR";
		if (c == CellType.FORMULA) return "FORMULA";
		if (c == CellType.NUMERIC) if (DateUtil.isCellDateFormatted(cell)) return "DATE"; else return "NUMERIC";
		if (c == CellType.STRING) return "STRING";

		return null;
	}

	/**
	 * <odoc>
	 * <key>XLS.XLS(aObject, aPassword, readOnly) : XLS</key>
	 * Creates a new instance. You can optionally provide a filename to load (with aPassword if defined) or use as a template (readOnly = true) and/or an
	 * array of bytes (aObject). Example:\
	 * \
	 * var xls = new XLS("c:/test.xlsx");\
	 * \
	 * </odoc>
	 * @throws InvalidFormatException
	 * @throws EncryptedDocumentException
	 */
	@JSConstructor
	public void newXLS(Object arg, String password, boolean readOnly) throws IOException, EncryptedDocumentException, InvalidFormatException {
		wbook = null;

		if (arg instanceof String) {
			// It's a filename
			try {
				//POIFSFileSystem poifs = new POIFSFileSystem(new File((String) arg), readOnly);
				this.read_only = readOnly;
				this.aFile = new File((String) arg);
				if (readOnly) {
					try ( FileInputStream fis = new FileInputStream(new File((String) arg)) ) {
						wbook = WorkbookFactory.create(fis, password);
					}
				} else {
					wbook = WorkbookFactory.create(this.aFile, password);
				}
			} catch (Exception e) {
				wbook = new XSSFWorkbook((String) arg);
			}
		}

		if (arg instanceof byte[]) {
			try {
				wbook = WorkbookFactory.create(new ByteArrayInputStream((byte[]) arg));
			} catch (Exception e) {
				wbook = new XSSFWorkbook(new ByteArrayInputStream((byte[]) arg));
			}
		}

		if (wbook == null) {
			wbook = new XSSFWorkbook();
		}

		evaluator = wbook.getCreationHelper().createFormulaEvaluator();
	}

	/**
	 * <odoc>
	 * <key>XLS.getWorkbook() : Workbook</key>
	 * Returns the Apache Java POI Workbook object used internally.
	 * </odoc>
	 */
	@JSFunction
	public Workbook getWorkbook() {
		return wbook;
	}

	/**
	 * <odoc>
	 * <key>XLS.getClassIndexedColors(aName) : IndexedColors</key>
	 * Returns the Apache Java POI IndexedColors object used internally.
	 * </odoc>
	 */
	@JSFunction
	public Object getClassIndexedColors(String name) {
		return (Object) org.apache.poi.ss.usermodel.IndexedColors.valueOf(name);
	}

	/**
	 * <odoc>
	 * <key>XLS.getClassBorderStyle(aName) : BorderStyle</key>
	 * Returns the Apache Java POI BorderStyle object used internally.
	 * </odoc>
	 */
	@JSFunction
	public Object getClassBorderStyle(String name) {
		return (Object) org.apache.poi.ss.usermodel.BorderStyle.valueOf(name);
	}

	/**
	 * <odoc>
	 * <key>XLS.getClassVerticalAlignment(aName) : VerticalAlignment</key>
	 * Returns the Apache Java POI VerticalAlignment object used internally.
	 * </odoc>
	 */
	@JSFunction
	public Object getClassVerticalAlignment(String name) {
		return (Object) org.apache.poi.ss.usermodel.VerticalAlignment.valueOf(name);
	}

	/**
	 * <odoc>
	 * <key>XLS.getClassHorizontalAlignment(aName) : HorizontalAlignment</key>
	 * Returns the Apache Java POI HorizontalAlignment object used internally.
	 * </odoc>
	 */
	@JSFunction
	public Object getClassHorizontalAlignment(String name) {
		return (Object) org.apache.poi.ss.usermodel.HorizontalAlignment.valueOf(name);
	}

	/**
	 * <odoc>
	 * <key>XLS.getBorderStyle(aName) : BorderStyle</key>
	 * Returns the Apache Java POI BorderStyle object used internally.
	 * </odoc>
	 */
	@JSFunction
	public Object getBorderStyle(String aBorderStyle) {
		switch(aBorderStyle) {
		case "dash_dot": return org.apache.poi.ss.usermodel.BorderStyle.DASH_DOT; 
		case "dash_dot_dot": return org.apache.poi.ss.usermodel.BorderStyle.DASH_DOT_DOT; 
		case "dashed": return org.apache.poi.ss.usermodel.BorderStyle.DASHED; 
		case "dotted": return org.apache.poi.ss.usermodel.BorderStyle.DOTTED; 
		case "double": return org.apache.poi.ss.usermodel.BorderStyle.DOUBLE; 
		case "hair": return org.apache.poi.ss.usermodel.BorderStyle.HAIR; 
		case "medium": return org.apache.poi.ss.usermodel.BorderStyle.MEDIUM; 
		case "medium_dash_dot": return org.apache.poi.ss.usermodel.BorderStyle.MEDIUM_DASH_DOT; 
		case "medium_dash_dot_dot": return org.apache.poi.ss.usermodel.BorderStyle.MEDIUM_DASH_DOT_DOT; 
		case "medium_dashed": return org.apache.poi.ss.usermodel.BorderStyle.MEDIUM_DASHED; 
		case "none": return org.apache.poi.ss.usermodel.BorderStyle.NONE; 
		case "slanted_dash_dot": return org.apache.poi.ss.usermodel.BorderStyle.SLANTED_DASH_DOT; 
		case "thick": return org.apache.poi.ss.usermodel.BorderStyle.THICK; 
		case "thin": return org.apache.poi.ss.usermodel.BorderStyle.THIN; 
		}
		
		return null;
	}

	/**
	 * <odoc>
	 * <key>XLS.getCellRangeAddress(aRange) : CellRangeAddress</key>
	 * Returns the Apache Java POI CellRangeAddress object used internally.
	 * </odoc>
	 */
	@JSFunction
	public Object getCellRangeAddress(String aRange) {
		return org.apache.poi.ss.util.CellRangeAddress.valueOf(aRange);
	}

	@JSFunction
	public Object getEnumIndexedColors(String name) {
		return org.apache.poi.ss.usermodel.IndexedColors.valueOf(name);
	}

	@JSFunction
	public Object getEnumFillPatternType(String name) {
		return org.apache.poi.ss.usermodel.FillPatternType.valueOf(name);
	}

	/**
	 * <odoc>
	 * <key>XLS.getIndexedColors(aColorName) : IndexedColors</key>
	 * Returns the Apache Java POI IndexedColors object used internally.
	 * </odoc>
	 */
	@JSFunction
	public short getIndexedColors(String aColorName) {
		org.apache.poi.ss.usermodel.IndexedColors c = null;
		switch(aColorName) {
		case "aqua": c = org.apache.poi.ss.usermodel.IndexedColors.AQUA; break;
		case "auto": c = org.apache.poi.ss.usermodel.IndexedColors.AUTOMATIC; break;
		case "black": c = org.apache.poi.ss.usermodel.IndexedColors.BLACK; break;
		case "blue": c = org.apache.poi.ss.usermodel.IndexedColors.BLUE; break;
		case "blue_grey": c = org.apache.poi.ss.usermodel.IndexedColors.BLUE_GREY; break;
		case "bright_green": c = org.apache.poi.ss.usermodel.IndexedColors.BRIGHT_GREEN; break;
		case "brown": c = org.apache.poi.ss.usermodel.IndexedColors.BROWN; break;
		case "coral": c = org.apache.poi.ss.usermodel.IndexedColors.CORAL; break;
		case "cornflower_blue": c = org.apache.poi.ss.usermodel.IndexedColors.CORNFLOWER_BLUE; break;
		case "dark_blue": c = org.apache.poi.ss.usermodel.IndexedColors.DARK_BLUE; break;
		case "dark_green": c = org.apache.poi.ss.usermodel.IndexedColors.DARK_GREEN; break;
		case "dark_red": c = org.apache.poi.ss.usermodel.IndexedColors.DARK_RED; break;
		case "dark_teal": c = org.apache.poi.ss.usermodel.IndexedColors.DARK_TEAL; break;
		case "dark_yellow": c = org.apache.poi.ss.usermodel.IndexedColors.DARK_YELLOW; break;
		case "gold": c = org.apache.poi.ss.usermodel.IndexedColors.GOLD; break;
		case "green": c = org.apache.poi.ss.usermodel.IndexedColors.GREEN; break;
		case "grey25": c = org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT; break;
		case "grey40": c = org.apache.poi.ss.usermodel.IndexedColors.GREY_40_PERCENT; break;
		case "grey50": c = org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT; break;
		case "grey80": c = org.apache.poi.ss.usermodel.IndexedColors.GREY_80_PERCENT; break;
		case "indigo": c = org.apache.poi.ss.usermodel.IndexedColors.INDIGO; break;
		case "lavender": c = org.apache.poi.ss.usermodel.IndexedColors.LAVENDER; break;
		case "lemon_chiffon": c = org.apache.poi.ss.usermodel.IndexedColors.LEMON_CHIFFON; break;
		case "light_blue": c = org.apache.poi.ss.usermodel.IndexedColors.LIGHT_BLUE; break;
		case "light_cornflower_blue": c = org.apache.poi.ss.usermodel.IndexedColors.LIGHT_CORNFLOWER_BLUE; break;
		case "light_green": c = org.apache.poi.ss.usermodel.IndexedColors.LIGHT_GREEN; break;
		case "light_orange": c = org.apache.poi.ss.usermodel.IndexedColors.LIGHT_ORANGE; break;
		case "light_turquoise": c = org.apache.poi.ss.usermodel.IndexedColors.LIGHT_TURQUOISE; break;
		case "light_yellow": c = org.apache.poi.ss.usermodel.IndexedColors.LIGHT_YELLOW; break;
		case "lime": c = org.apache.poi.ss.usermodel.IndexedColors.LIME; break;
		case "maroon": c = org.apache.poi.ss.usermodel.IndexedColors.MAROON; break;
		case "olive_green": c = org.apache.poi.ss.usermodel.IndexedColors.OLIVE_GREEN; break;
		case "orange": c = org.apache.poi.ss.usermodel.IndexedColors.ORANGE; break;
		case "orchid": c = org.apache.poi.ss.usermodel.IndexedColors.ORCHID; break;
		case "pale_blue": c = org.apache.poi.ss.usermodel.IndexedColors.PALE_BLUE; break;
		case "pink": c = org.apache.poi.ss.usermodel.IndexedColors.PINK; break;
		case "plum": c = org.apache.poi.ss.usermodel.IndexedColors.PLUM; break;
		case "red": c = org.apache.poi.ss.usermodel.IndexedColors.RED; break;
		case "rose": c = org.apache.poi.ss.usermodel.IndexedColors.ROSE; break;
		case "royal_blue": c = org.apache.poi.ss.usermodel.IndexedColors.ROYAL_BLUE; break;
		case "sea_green": c = org.apache.poi.ss.usermodel.IndexedColors.SEA_GREEN; break;
		case "sky_blue": c = org.apache.poi.ss.usermodel.IndexedColors.SKY_BLUE; break;
		case "tan": c = org.apache.poi.ss.usermodel.IndexedColors.TAN; break;
		case "teal": c = org.apache.poi.ss.usermodel.IndexedColors.TEAL; break;
		case "turquoise": c = org.apache.poi.ss.usermodel.IndexedColors.TURQUOISE; break;
		case "violet": c = org.apache.poi.ss.usermodel.IndexedColors.VIOLET; break;
		case "white": c = org.apache.poi.ss.usermodel.IndexedColors.WHITE; break;
		case "yellow": c = org.apache.poi.ss.usermodel.IndexedColors.YELLOW; break;
		}
		
		if (c != null) return c.getIndex(); else return -1;
	}

	/**
	 * <odoc>
	 * <key>XLS.getSheet(aSheetRef) : Object</key>
	 * Returns the Apache Java POI Sheet object to be used together with other plugin functions whenever an operation 
	 * should be performed on this specific sheet (aSheetRef as a name or number). If the sheet doesn't exist it
	 * will try to create it. Example:\
	 * \
	 * var xls = new XLS();\
	 * var sheet = xls.getSheet("Sheet4");\
	 * \
	 * </odoc>
	 */
	@JSFunction
	public Object getSheet(String at) {
		Sheet sheet;
		try {
			sheet = wbook.getSheetAt(Integer.valueOf(at));
		} catch (Exception e) {
			try {
				sheet = wbook.getSheet(at);
			} catch (Exception ee) {
				sheet = wbook.createSheet(at);
			}
		}

		if (sheet == null) sheet = wbook.createSheet(at);

		return sheet;
	}

	/**
	 * <odoc>
	 * <key>XLS.getSheetNames() : Array</key>
	 * Returns the list of the current workbook sheet names.
	 * </odoc>
	 */
	@JSFunction
	public Object getSheetNames() {
		ArrayList<String> list = new ArrayList<String>();

		for(int o = 0; o < this.wbook.getNumberOfSheets(); o++) {
			list.add(this.wbook.getSheetAt(o).getSheetName());
		}

		return AFCmdBase.jse.newArray(AFCmdBase.jse.getGlobalscope(), list.toArray());
	}

	/**
	 * <odoc>
	 * <key>XLS.getCellNames() : Array</key>
	 * Returns an array of workbook cell names each with the corresponding name, the corresponding refer formula
	 * and if it's a user-defined function.
	 * </odoc>
	 */
	@JSFunction
	public Object getCellNames() {
		ArrayList<Scriptable> list = new ArrayList<Scriptable>();
		List nlist = this.wbook.getAllNames();
		
		for(int o = 0; o < nlist.size(); o++) {
			Scriptable nname = (Scriptable) AFCmdBase.jse.newObject(AFCmdBase.jse.getGlobalscope());
			nname.put("name", nname, ((Name) nlist.get(o)).getNameName());
			nname.put("refers", nname, ((Name) nlist.get(o)).getRefersToFormula());
			nname.put("isFunction", nname, ((Name) nlist.get(o)).isFunctionName());
			nname.put("comment", nname, ((Name) nlist.get(o)).getComment());
			list.add(nname);
		}

		return AFCmdBase.jse.newArray(AFCmdBase.jse.getGlobalscope(), list.toArray());
	}

	/**
	 * <odoc>
	 * <key>XLS.removeCellName(aName)</key>
	 * Tries to remove the workbook cell name aName.
	 * </odoc>
	 */
	@JSFunction
	public void removeCellName(String aName) {
		this.wbook.removeName(this.wbook.getName(aName));
	}

	/**
	 * <odoc>>
	 * <key>XLS.setCellName(aName, referFormula, aSheet, aComment)</key>
	 * Add aName as a workbook cell name refering to referFormula (for example "'mySheet'!$A$1").
	 * Optionally you can apply it only to aSheet (String) and/or add aComment.
	 * </odoc>
	 */
	@JSFunction
	public void setCellName(String aName, String referFormula, Object sheet, Object comment) {
		Name nn = this.wbook.getName(aName);

		if (nn == null) {
			nn = this.wbook.createName();
			nn.setNameName(aName);
		}

		nn.setRefersToFormula(referFormula);
		if (comment instanceof String && comment != null) nn.setComment((String) comment);
		if (sheet instanceof String && sheet != null) nn.setSheetIndex(this.wbook.getSheetIndex((String) sheet));
	}

	/**
	 * <odoc>
	 * <key>XLS.close()</key>
	 * Closes the current workbook.
	 * </odoc>
	 */
	@JSFunction
	public void close() throws IOException {
		wbook.close();
	}

	/**
	 * <odoc>
	 * <key>XLS.getCell(aSheet, aColumn, aRow, evaluateFormulas) : Object</key>
	 * Returns the value, on a given sheet (aSheet), located on the given column and row. Optionally the evaluated
	 * formula can be provided also. Example:\
	 * \
	 * var xls = new XLS("spreadsheet.xlsx");\
	 * var sheet = xls.getSheet("Sheet4");\
	 * \
	 * print(xls.getCell(sheet, "B", 3, true));\
	 * // {\
	 * //    "type": "FORMULA",\
	 * //    "formula": "=B1+B2",\
	 * //    "val": 34\
	 * // }\
	 * \
	 * </odoc>
	 */
	@JSFunction
	public Object getCell(Object sheet, Object sy, int x, boolean evaluateFormulas) {
		int y = translateObject(sy);
		Scriptable no = (Scriptable) AFCmdBase.jse.newObject(AFCmdBase.jse.getGlobalscope());

		Row row = ((Sheet) sheet).getRow(x - 1);
		Cell cell = null;
		if (row != null)
			cell = row.getCell(y - 1);

		if (cell != null)
			return getCellValue2JSON(no, cell, evaluateFormulas);

		return no;
	}

	/**
	 * <odoc>
	 * <key>XLS.getCellValue(aSheet, aColumn, aRow, evaluateFormulas) : Object</key>
	 * Returns the raw value from a given sheet (aSheet) on the given column and row. Optionally the evaluated
	 * formula can be provided also. Example:\
	 * \
	 * var xls = new XLS("spreadsheet.xlsx");\
	 * var sheet = xls.getSheet("Sheet4");\
	 * \
	 * print(xls.getCellValue(sheet, "B", 3, true));\
	 * // 34\
	 * \
	 * </odoc>
	 */
	@JSFunction
	public Object getCellValue(Object sheet, Object sy, int x, boolean evaluateFormulas) {
		int y = translateObject(sy);

		Row row = ((Sheet) sheet).getRow(x - 1);
		Cell cell = row.getCell(y - 1);

		if (cell != null)
			return getCellValueRaw(cell, evaluateFormulas, evaluateFormulas);
		else
			return "";
	}

	/**
	 * <odoc>
	 * <key>XLS.autoSizeColumn(aSheet, aColumn, useMergedCells)</key>
	 * Auto-sizes the given column on the given sheet. Optionally you can indicate to use merged
	 * cells on the auto-size operation. Example:\
	 * \
	 * var xls = new XLS("spreadsheet.xlsx");\
	 * var sheet = xls.getSheet("Sheet4");\
	 * \ 
	 * xls.autoSizeColumn(sheet, "B");\
	 * xls.writeFile("spreadsheet.xlsx");\
	 * \
	 * </odoc>
	 */
	@JSFunction
	public void autoSizeColumn(Object sheet, Object sy, boolean useMergedCells) {
		int y = translateObject(sy);

		((Sheet) sheet).autoSizeColumn(y - 1, useMergedCells);
	}

	/**
	 * <odoc>
	 * <key>XLS.setDataFormat(aNewDataFormat)</key>
	 * Sets the format conversion for date values (e.g. yyyy-m-d h:mm:ss).
	 * </odoc>
	 */
	@JSFunction
	public static void setDataFormat(String newdataformat) {
		dataformat = newdataformat;
	}

	/**
	 * <odoc>
	 * <key>XLS.getDataFormat() : String</key>
	 * Gets the format conversion currently being use.
	 * </odoc>
	 */
	@JSFunction
	public static String getDataFormat() {
		return dataformat;
	}

	/**
	 * <odoc>
	 * <key>XLS.setColumnWidth(aSheet, aColumn, aWidth)</key>
	 * Sets the column width of a column of the provided sheet.
	 * </odoc>
	 */
	@JSFunction
	public void setColumnWidth(Object sheet, Object sy, int width) {
		int y = translateObject(sy);

		((Sheet) sheet).setColumnWidth(y - 1, width);
	}

	/**
	 * <odoc>
	 * <key>XLS.setRowHeight(aSheet, aRow, aHeight)</key>
	 * Sets the row height for a row of the provided sheet.
	 * </odoc>
	 */
	@JSFunction
	public void setRowHeight(Object sheet, int row, int height) {
		Row xrow = ((Sheet) sheet).getRow(row);
		if (xrow != null) xrow.setHeight((short) height);
	}

	/**
	 * <odoc>
	 * <key>XLS.setCell(aSheet, aColumn, aRow, aValue, aStyle)</key>
	 * Sets a cell with the provided value given a sheet, column and row. Optionally a CellStyle Java object can be provided.
	 * Example: \
	 * \
	 * xls.setCell(sheet, "B", 5, "An example");\
	 * \
	 * </odoc>
	 */
	@JSFunction
	public void setCell(Object sheet, Object sy, int x, Object value, Object style)	throws UnsupportedEncodingException {
		int y = translateObject(sy);
		boolean isDate = false;
		CellStyle cstyle = null;
		CellStyle datastyle = this.dataStyleCache.get(style);
	    CellStyle longstyle = this.longStyleCache.get(style);
		
		Row row = ((Sheet) sheet).getRow(x-1);
		
		if (row == null) {
			row = ((Sheet) sheet).createRow(x-1);
		}
		
		if (style instanceof CellStyle) {
			cstyle = (CellStyle) style;
		}
		
		Cell cell = row.getCell(y-1);
		CellType type = CellType.STRING;
		
		if (value instanceof String || value instanceof ConsString) {
			type = CellType.STRING;
			if (value.toString().startsWith("=")) {
				type = CellType.FORMULA;
			}
			if (value instanceof ConsString) value = ((ConsString) value).toString();
			if (encoding != null && value instanceof String) value = new String(((String) value).getBytes(), encoding);
		}
		
		if (value instanceof Double || value instanceof Integer || value instanceof Float || value instanceof Long) {
			type = CellType.NUMERIC;
		}
		
		if (value instanceof Boolean) {
			type = CellType.BOOLEAN;
		}
		
		if (value != null && value.getClass().getName().equals("org.mozilla.javascript.NativeDate")) {
			type = CellType.NUMERIC;
			
			value = DateUtil.getExcelDate((Date) ((Context) AFCmdBase.jse.getNotSafeContext()).jsToJava(value, Date.class));
			isDate = true;
		}
		
		if (value == null) {
			type = CellType.BLANK;
			value = "";
		}
		
		if (cell == null) {
			cell = row.createCell(y-1, type);
			
			if (isDate) {
				//CellStyle cellStyle = wbook.createCellStyle();
				if (datastyle == null) {
					datastyle = wbook.createCellStyle();
					if (style != null)
						datastyle.cloneStyleFrom(cstyle);
					CreationHelper createHelper = wbook.getCreationHelper();
					datastyle.setDataFormat(createHelper.createDataFormat().getFormat(dataformat));

					this.dataStyleCache.put(style, datastyle);
				}
				
				cell.setCellStyle(datastyle);
			}
		}
		
		if (type == CellType.STRING) cell.setCellValue(value.toString());
		else if (type == CellType.FORMULA) cell.setCellFormula((value.toString()).replaceFirst("=", ""));
		else if (type == CellType.NUMERIC) { 
			if (value instanceof Integer) value = Double.valueOf((Integer) value);
			if (value instanceof Float)   value = Double.valueOf((Float) value);
			if (value instanceof Long) {
				value = Double.valueOf((Long) value);
				if (longstyle == null) {
					longstyle = wbook.createCellStyle();
					if (style != null)
						longstyle.cloneStyleFrom(cstyle);
					CreationHelper createHelper = wbook.getCreationHelper();
					longstyle.setDataFormat(createHelper.createDataFormat().getFormat(longformat));

					this.longStyleCache.put(style, longstyle);
				}
				cell.setCellStyle(longstyle);
			}
			cell.setCellValue((Double) value); 
		}
		else if (type == CellType.BOOLEAN) cell.setCellValue((Boolean) value); 
		else if (type == CellType.BLANK) cell.setCellValue(value.toString());
		else cell.setCellValue(value.toString());
		
		if (cstyle != null && !isDate) {
			cell.setCellStyle(cstyle);
		}
	}
	
	/**
	 * <odoc> 
	 * <key>XLS.writeFile(aFilename)</key>
	 * Writes the memory excel instance into a file. If undefined tries to write to the file passed on the constructor (if readonly is not set to true). Example:\
	 * \
	 *   xls.writeFile("spreadsheet.xlsx");\
	 * \
	 * </odoc>
	 */
	@JSFunction
	public void writeFile(Object file) throws Exception {
		class NullOutputStream extends OutputStream {
			@Override
			public void write(int b) throws IOException {
			}
		}

		if (!(file instanceof Undefined) && file != null) {
			File target = new File((String) file);

			if (this.aFile != null) System.out.println(this.aFile.getCanonicalPath());

			if (this.aFile != null && target.getCanonicalPath().equals(this.aFile.getCanonicalPath())) {
				if (!this.read_only) {
					try ( NullOutputStream fileout = new NullOutputStream() ) {
						wbook.write(fileout);
						fileout.flush();
						//fileout.close();
					}
				}
			} else {
				try ( FileOutputStream fileout = new FileOutputStream((String) file) ) {
					wbook.write(fileout);
					fileout.flush();
					//fileout.close();
				}
			}
		} else {
			if (!this.read_only) {
				try ( NullOutputStream fileout = new NullOutputStream() ) {
					wbook.write(fileout);
					fileout.flush();
					//fileout.close();
				}
			}
		}
		
		/*if (password != null) {
			POIFSFileSystem fs = new POIFSFileSystem();
			EncryptionInfo ei = new EncryptionInfo(org.apache.poi.poifs.crypt.EncryptionMode.agile);
			Encryptor enc = ei.getEncryptor();
			enc.confirmPassword(password);
			OPCPackage opc = OPCPackage.open(new File(file), org.apache.poi.openxml4j.opc.PackageAccess.READ_WRITE);
    		OutputStream os = enc.getDataStream(fs);
    		opc.save(os);
	
			FileOutputStream fos = new FileOutputStream(file);
			fs.writeFilesystem(fos);
			fos.close();
		}*/

		//wbook = new XSSFWorkbook(new FileInputStream(file));
	}
	
	public byte[] getBytes() throws IOException {
		ByteArrayOutputStream bos = new ByteArrayOutputStream();
		wbook.write(bos);
		bos.flush();
		return bos.toByteArray();
	}
	
	/**
	 * <odoc>
	 * <key>XLS.toDate(aDateValue) : String</key>
	 * Converts a excel date value into a string given the data format (see getDataFormat())
	 * </odoc>
	 */
	@JSFunction
	public static String toDate(double d) {
		Calendar cal = new GregorianCalendar();
		cal.setTime(DateUtil.getJavaDate(d));
		
		StringBuffer data = new StringBuffer();
		
		String year  = String.valueOf(cal.get(Calendar.YEAR));
		String month = String.valueOf(cal.get(Calendar.MONTH)+1); 
		String day   = String.valueOf(cal.get(Calendar.DAY_OF_MONTH)); 
		String hour  = String.valueOf(cal.get(Calendar.HOUR_OF_DAY)); 
		String min   = String.valueOf(cal.get(Calendar.MINUTE));
		String sec   = String.valueOf(cal.get(Calendar.SECOND));
		data.append(year); data.append("-");
		data.append(("00" + month).substring(month.length())); data.append("-");
		data.append(("00" + day).substring(day.length())); data.append("-T");
		data.append(("00" + hour).substring(hour.length())); data.append(":");
		data.append(("00" + min).substring(min.length())); data.append(":");
		data.append(("00" + sec).substring(sec.length())); data.append(".000Z");
		
		return data.toString();
	}
	
	/**
	 * <odoc>
	 * <key>XLS.getCellValueRaw(aXSSFCellObject, isFormulaEvaluated, shouldEvaluateFormula) : Object</key>
	 * Provides a low level conversion of the value of a cell given the corresponding XSSFCell Java object.
	 * Optionally you can provide the indication if the formula has been evaluated or not and if it should
	 * be re-evaluated.
	 * </odoc>
	 */
	@JSFunction
	public Object getCellValueRaw(Object cel, boolean isFormulaEvaluated, boolean evaluateFormula) {
		Object data = null;
		Cell cell = (Cell) cel;
		
		@SuppressWarnings("deprecation")
		CellType type = cell.getCellType();
		if (type == CellType.BOOLEAN) data = cell.getBooleanCellValue();
		else if (type == CellType.NUMERIC) {
			double d = cell.getNumericCellValue();

			if (DateUtil.isCellDateFormatted(cell)) {
				data = toDate(d);
			} else {
				data = d;
			}
		}
		else if (type == CellType.STRING) data = cell.getStringCellValue();
		else if (type == CellType.BLANK) data = "";
		else if (type == CellType.FORMULA) {
			if (evaluateFormula) {
				evaluator.evaluate(cell);
			}
			if (isFormulaEvaluated) {
				@SuppressWarnings("deprecation")
				CellType ctf = cell.getCachedFormulaResultType();
				if (ctf == CellType.BOOLEAN) data = cell.getBooleanCellValue();
				else if (ctf == CellType.NUMERIC) {
					double dd = cell.getNumericCellValue();
	
					if (DateUtil.isCellDateFormatted(cell)) {
						data = toDate(dd);
					} else {
						data = dd;
					}
				} 
				else if (ctf == CellType.STRING) data = cell.getStringCellValue();
				else {
					data = cell.getStringCellValue(); 
				}
			} else {
				data = cell.getCellFormula();
			}
		} else {
			data = cell.getStringCellValue();
		}
		
		return data;
	}
	
	@SuppressWarnings("deprecation")
	protected Object getCellValue2JSON(Scriptable no, Cell cell, boolean evaluateFormulas) {
		Scriptable cellS = (Scriptable) AFCmdBase.jse.newObject(no);
		
		//cellS.put("row", cellS, x);
		//cellS.put("col", cellS, y);
		cellS.put("type", cellS, translateType(cell));
		
		if (evaluateFormulas && cell.getCellType() == CellType.FORMULA) {
			CellValue cellValue = evaluator.evaluate(cell);
			
				CellType ct = cellValue.getCellType();
			    if (ct == CellType.BOOLEAN) cellS.put("val", cellS, cellValue.getBooleanValue()); 
			    else if (ct == CellType.NUMERIC) { 
					double d = cellValue.getNumberValue();

					if (DateUtil.isCellDateFormatted(cell)) {
						cellS.put("val", cellS, toDate(d));
					} else {
						cellS.put("val", cellS, d); 
					}
			    } 
			    else if (ct == CellType.STRING) cellS.put("val", cellS, cellValue.getStringValue());
		    //else if (ct == CellType.BLANK)
		    //else if (ct == CellType.ERROR)
		    //else if (ct == CellType.FORMULA)
			
    		cellS.put("formula", cellS, "=" + getCellValueRaw(cell, false, false));
		} else {
			cellS.put("val", cellS, getCellValueRaw(cell, false, false));
		}
		
		return cellS;
	}
	
	/**
	 * <odoc>
	 * <key>XLS.setTable(aSheet, aColumn, aRow, anArray, keyStyler, lineStyler)</key>
	 * Provides a tabular representation of a JSON array starting on the column and row of the provided sheet.
	 * Optionally you can provide a cell style for the headings (keyStyler) and lines (lineStyler).
	 * Example: \
	 * \
	 * var arr = [\
	 *  { "FIELD A": 1, "FIELD B": 2, "FIELD C": "OFF" },\
	 *  { "FIELD A": 2, "FIELD B": 2, "FIELD C": "ON" }\
	 * ];\
	 * \
	 * xls.setTable(sheet, "B", 2, arr);\
	 * \
	 * </odoc>
	 */
	@JSFunction
	public void setTable(Object sheet, Object signoreY, int ignoreX, Object table, Object keyStyle, Object lineStyle) throws UnsupportedEncodingException {
		if (table instanceof NativeArray) {
			if (keyStyle != null && keyStyle instanceof Undefined) keyStyle = null;
			if (lineStyle != null && lineStyle instanceof Undefined) lineStyle = null;
			
			int ignoreY = 0;
			if (signoreY != null && !(signoreY instanceof Undefined)) {
				ignoreY = translateObject(signoreY);
			}
			
			NativeArray na = (NativeArray) table;
			if (na.size() > 0) {
				int numberColumns = 0;
				
				for(int x = ignoreX; x < (na.size() + ignoreX); x++) {
					Object _o = na.get(x - ignoreX);
					NativeObject no = null;
					if (_o instanceof NativeObject) {
						no = (NativeObject) na.get(x - ignoreX);
					} else {
						if (_o instanceof org.mozilla.javascript.ConsString) {
							NativeObject converted = (NativeObject) AFCmdBase.jse.newObject(AFCmdBase.jse.getGlobalscope());
							converted.put("value", converted, _o.toString());
							no = converted;
						} else {
							no = (NativeObject) AFCmdBase.jse.newObject(AFCmdBase.jse.getGlobalscope());
						}
					}
					numberColumns = no.keySet().size();
					
					// Header
					if (x == ignoreX) {
						int i = ignoreY;
						for(Object key : no.keySet()) {
							setCell(sheet, i, ignoreX, key.toString(), keyStyle);
							i++;
						}
					}
					
					for (int y = ignoreY; y < (numberColumns + ignoreY); y++) {
						setCell(sheet, y, x+1, no.get(no.keySet().toArray()[y-ignoreY]), lineStyle);
					}
				}

			}
		}
	}
	
	/**
	 * <odoc>
	 * <key>XLS.getCellStyler() : Object</key>
	 * Returns the current workbook CellStyle Java object to use to build cell styles.
	 * </odoc>
	 */
	@JSFunction
	public Object getCellStyler() {
		return wbook.createCellStyle();
	}
	
	/**
	 * <odoc>
	 * <key>XLS.getNewFont() : Object</key>
	 * Returns a new Java Font object to be used with CellStyle.
	 * </odoc>
	 */
	@JSFunction
	public Object getNewFont() {
		return wbook.createFont();
	}
	
	/**
	 * <odoc>
	 * <key>XLS.getNewDataFormat() : Object</key>
	 * Returns a new Java Data Format object to be used with CellStyle
	 * </odoc>
	 */
	public Object getNewDataFormat() {
		return wbook.createDataFormat();
	}
	
	/**
	 * <odoc>
	 * <key>XLS.setJSON(aSheet, aColumn, aRow, aMap, shouldFormatCells, aStyle) : Number</key>
	 * Provides a representation of a JSON map starting on the column and row of the provided sheet. Optionally
	 * it can perform minimal cell formatting by merging cells and correcting vertical alignment. A cell style
	 * to apply to every cell can also optionally be provided. Example:\
	 * \
	 * var a = af.exec("DM.GetAllEntities");\
	 * \
	 * xls.setJSON(sheet, "B", 2, a, true);\
	 * \
	 * </odoc>
	 */
	@JSFunction
	public int setJSON(Object sheet, Object signoreY, int ignoreX, Object map, boolean format, Object cstyle) throws UnsupportedEncodingException {
		if (map instanceof NativeObject || map instanceof NativeArray) {
			int ignoreY = 0;
			int x = ignoreX;
			if (signoreY != null && !(signoreY instanceof Undefined)) {
				ignoreY = translateObject(signoreY);
			}
			
			if (format) {
				if (cstyle == null || cstyle instanceof Undefined) {
					cstyle = getCellStyler();
					((CellStyle) cstyle).setVerticalAlignment(VerticalAlignment.TOP);
				}
			}
			
			if (map instanceof NativeObject) {
				NativeObject na = (NativeObject) map;
				
				for(Object key : na.keySet()) {			
					Object value = na.get(key);
					
					int origX = x;
					setCell(sheet, ignoreY, x, key, cstyle);
					if (!(value instanceof NativeObject) && !(value instanceof NativeArray)) {
						setCell(sheet, ignoreY + 1, x, value, cstyle);
						x++;
					} else {
						x = x + setJSON(sheet, ignoreY + 1, x, value, format, cstyle);
					}
					
					if (format) {
						if ((x-2) > (origX-1)) {
							CellRangeAddress cra = new CellRangeAddress(origX-1, x-2, ignoreY-1, ignoreY-1);
							((Sheet) sheet).addMergedRegion(cra);
						}
					}
				}
			}
			
			if (map instanceof NativeArray) {
				NativeArray na = (NativeArray) map;
				
				for(int i = 0; i < na.size(); i++) {
					Object o = na.get(i);
					
					int origX = x;
					setCell(sheet, ignoreY, x, i, cstyle);
					if (!(o instanceof NativeObject) && !(o instanceof NativeArray)) {
						setCell(sheet, ignoreY + 1, x, o, cstyle);
						x++;
					} else {
						x = x + setJSON(sheet, ignoreY + 1, x, o, format, cstyle);
					}
					
					if (format) {
						if ((x-2) > (origX-1)) {
							CellRangeAddress cra = new CellRangeAddress(origX-1, x-2, ignoreY-1, ignoreY-1);
							((Sheet) sheet).addMergedRegion(cra);
						}
					}
				}
				x++;
			}
			
//			if (format) {
//				autoSizeColumn(sheet, ignoreY, true);
//				autoSizeColumn(sheet, ignoreY + 1, true);
//			}
			
			return x - ignoreX;
		}
		
		return 0;
	}
	
	/**
	 * <odoc>
	 * <key>XLS.getTable(aSheet, shoudEvaluateFormulas, startOnColumn, startOnRow) : Object</key>
	 * Tries to retrieve JSON array representation of a table from the provided sheet starting on the provided column and row.
	 * Optionally existing formulas values can be evaluated so the result will be the value included in the returned JSON array.
	 * Example:\
	 * \
	 * //        A        B         C \
	 * // 1   FieldA    FieldB    FieldC   \
	 * // 2     123       ON       =A2+1  \
	 * // 3     120       OFF      =A3+1 \
	 * \
	 * var tab = xls.getTable(sheet, true, "A", 1);\
	 * print(beautifier(tab));\
	 * \
	 * // {\
	 * //    "table": [\
	 * //       { "FieldA": 123, "FieldB": "ON", "FieldC": 124 },\
	 * //       { "FieldA": 120, "FieldB": "OFF", "FieldC": 121 }\
	 * //    ]\
	 * // } \
	 * </odoc>
	 */
	@SuppressWarnings("deprecation")
	@JSFunction
	public Object getTable(Object sheet, boolean evaluateFormulas, Object signoreCol, int ignoreRow) {
		Scriptable no = (Scriptable) AFCmdBase.jse.newObject(AFCmdBase.jse.getGlobalscope());
		
		int ignoreCol = 0;
		if (signoreCol != null && !(signoreCol instanceof Undefined)) {
			ignoreCol = translateObject(signoreCol);
		}
		
		Iterator<Row> rowIterator = ((Sheet) sheet).iterator();

		Row row = null;
		Cell cell;
		int x = 1, y = 1;
		
		// First row
		ArrayList<String> keys = new ArrayList<String>();
		boolean shouldContinue = true;
		
		while (rowIterator.hasNext() && shouldContinue) {
			row = rowIterator.next();
			if (row.getRowNum() >= (ignoreRow - 1)) {
				shouldContinue = false;
			}
		}
		
		if (!shouldContinue) {
			Iterator<Cell> cellIterator = row.cellIterator();
			
			y = 1;
			shouldContinue = true;
			while(cellIterator.hasNext() && shouldContinue) {
				cell = cellIterator.next();
				
				if (cell.getColumnIndex() >= (ignoreCol-1)) {				
					if (cell.getCellType() != CellType.BLANK) {
						keys.add(getCellValueRaw(cell, true, true).toString());
					} else {
						shouldContinue = false;
					}
				}
			}
		}
		
		if (keys.size() > 0) {
			ArrayList<Scriptable> records = new ArrayList<Scriptable>();
			
	        while (rowIterator.hasNext()) {
	        	row = rowIterator.next();
	        	
	        	if (row.getRowNum() >= (ignoreRow-1)) {        		
		        	Iterator<Cell> cellIterator = row.cellIterator();
		        	Scriptable record = (Scriptable) AFCmdBase.jse.newObject(no);
		        	
		        	y = 1; 
		        	int last = -1;
		        	while(cellIterator.hasNext() && ((y - ignoreCol) <= keys.size())) {
		        		cell = cellIterator.next();
		        	
		        		if (cell.getColumnIndex() < (ignoreCol-1)) continue;

		        		if (last > -1 && (cell.getColumnIndex() - last) > 1) {
		        			for(int i = last + 1; i <= cell.getColumnIndex(); i++) {
								if (keys.size() > i)
		        					record.put(keys.get(i), record, null);
		        			}
		        		}
						
						if (keys.size() > (cell.getColumnIndex() - ignoreCol + 1))
		        			record.put(keys.get(cell.getColumnIndex() - ignoreCol + 1), record, getCellValueRaw(cell, true, evaluateFormulas));
		        		y++;
		        		last = cell.getColumnIndex();
		        	}
		        	
		        	records.add(record);
		        	x++;
	        	}
	        }
	        
        	no.put("table", no, AFCmdBase.jse.newArray(no, records.toArray()));
		}
		
		return no;
	}
	
	/**
	 * TBC
	 * 
	 * @param sheet
	 * @param evaluateFormulas
	 * @param signoreY
	 * @param ignoreX
	 * @return
	 */
	@JSFunction
	public Object getMap(Object sheet, boolean evaluateFormulas, Object signoreY, int ignoreX) {
		Scriptable no = (Scriptable) AFCmdBase.jse.newObject(AFCmdBase.jse.getGlobalscope());
		
		return no;	
	}
	
	/**
	 * <odoc>
	 * <key>XLS.getCellValues(aSheet, shouldEvaluateFormulas, startOnX, startOnY) : Object</key>
	 * Returns a map indexed by row and column with all the values and types on the current memory excel representation. 
	 * Example:\
	 * \
	 * var excel = xls.getCellValues(sheet, true);\
	 * \ 
	 * print(beautifier(excel[2]["C"]));\
	 * // { "type": "STRING", "val": "Example value" }\
	 * \
	 * </odoc>
	 */
	@JSFunction
	public Object getCellValues(Object sheet, boolean evaluateFormulas, Object signoreY, int ignoreX) {
		Scriptable no = (Scriptable) AFCmdBase.jse.newObject(AFCmdBase.jse.getGlobalscope());
		
		int ignoreY = 0;
		if (signoreY != null && !(signoreY instanceof Undefined)) {
			ignoreY = translateObject(signoreY);
		}
		
		Iterator<Row> rowIterator = ((Sheet) sheet).iterator();
		Row row;
		Cell cell;
		int x = 1, y = 1;
		
        while (rowIterator.hasNext()) {
        	row = rowIterator.next();
        	
        	if (row.getRowNum() < (ignoreX-1)) continue;
        	
        	Iterator<Cell> cellIterator = row.cellIterator();
        	Scriptable rowS = (Scriptable) AFCmdBase.jse.newObject(no);
        	
        	y = 1;
        	while(cellIterator.hasNext()) {
        		cell = cellIterator.next();
        		
        		if (cell.getColumnIndex() < (ignoreY-1)) continue;
        		
        		Scriptable cellS = (Scriptable) getCellValue2JSON(no, cell, evaluateFormulas);
        		rowS.put(toName(y), rowS, cellS);
        		y++;
        	}
        	
        	no.put(x, no, rowS);
        	
        	x++;
        }
        
        
		
		return no;
	}
}

