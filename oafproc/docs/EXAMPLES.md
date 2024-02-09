# OpenAF processor examples

## 🥈 Medium

### Using a LLM to generate a table

Setting up the LLM model and gather the data into a data.json file:

```bash
export OAFP_MODEL="(type: openai, model: gpt-3.5-turbo, key: ..., timeout: 900000)"
echo "list all United Nations secretaries with their corresponding 'name', their mandate 'begin date', their mandate 'end date' and their corresponding secretary 'numeral'" | oafp input=llm output=json > data.json
```

Checking the obtain data:

```yaml
oafp data.json
─ secretaries ╭ [0] ╭ name      : Trygve Lie 
              │     ├ begin date: 1946-02-01 
              │     ├ end date  : 1952-11-10 
              │     ╰ numeral   : 1 
              ├ [1] ╭ name      : Dag Hammarskjöld 
              │     ├ begin date: 1953-04-10 
              │     ├ end date  : 1961-09-18 
              │     ╰ numeral   : 2 
              ├ [2] ╭ name      : U Thant 
              │     ├ begin date: 1961-11-30 
              │     ├ end date  : 1971-12-31 
              │     ╰ numeral   : 3 
              ├ [3] ╭ name      : Kurt Waldheim 
              │     ├ begin date: 1972-01-01 
              │     ├ end date  : 1981-12-31 
              │     ╰ numeral   : 4 
              ├ [4] ╭ name      : Javier Pérez de Cuéllar 
              │     ├ begin date: 1982-01-01 
              │     ├ end date  : 1991-12-31 
              │     ╰ numeral   : 5 
              ├ [5] ╭ name      : Boutros Boutros-Ghali 
              │     ├ begin date: 1992-01-01 
              │     ├ end date  : 1996-12-31 
              │     ╰ numeral   : 6 
              ├ [6] ╭ name      : Kofi Annan 
              │     ├ begin date: 1997-01-01 
              │     ├ end date  : 2006-12-31 
              │     ╰ numeral   : 7 
              ├ [7] ╭ name      : Ban Ki-moon 
              │     ├ begin date: 2007-01-01 
              │     ├ end date  : 2016-12-31 
              │     ╰ numeral   : 8 
              ╰ [8] ╭ name      : António Guterres 
                    ├ begin date: 2017-01-01 
                    ├ end date  : present 
                    ╰ numeral   : 9 
```

Checking the data in a table format:

```
oafp data.json path=secretaries output=ctable
         name          │begin date│ end date │numeral
───────────────────────┼──────────┼──────────┼───────
Trygve Lie             │1946-02-01│1952-11-10│1      
Dag Hammarskjöld       │1953-04-10│1961-09-18│2      
U Thant                │1961-11-30│1971-12-31│3      
Kurt Waldheim          │1972-01-01│1981-12-31│4      
Javier Pérez de Cuéllar│1982-01-01│1991-12-31│5      
Boutros Boutros-Ghali  │1992-01-01│1996-12-31│6      
Kofi Annan             │1997-01-01│2006-12-31│7      
Ban Ki-moon            │2007-01-01│2016-12-31│8      
António Guterres       │2017-01-01│present   │9      
[#9 rows]
```

### Using a LLM to transform an input

Using the data gather in ['Using a LLM to generate a table'](#using-a-llm-to-generate-a-table) use a LLM to transform it:

```bash
export OAFP_MODEL="(type: openai, model: gpt-3.5-turbo, key: ..., timeout: 900000)"
oafp data.json llmprompt="convert the numeral number into a roman number" path=secretaries output=ctable
```

Result:

```
         name          │begin date│ end date │numeral
───────────────────────┼──────────┼──────────┼───────
Trygve Lie             │1946-02-01│1952-11-10│I      
Dag Hammarskjöld       │1953-04-10│1961-09-18│II     
U Thant                │1961-11-30│1971-12-31│III    
Kurt Waldheim          │1972-01-01│1981-12-31│IV     
Javier Pérez de Cuéllar│1982-01-01│1991-12-31│V      
Boutros Boutros-Ghali  │1992-01-01│1996-12-31│VI     
Kofi Annan             │1997-01-01│2006-12-31│VII    
Ban Ki-moon            │2007-01-01│2016-12-31│VIII   
António Guterres       │2017-01-01│present   │IX     
[#9 rows]
```

### Using a private LLM to generate sample data

```bash
export OAFP_MODEL="(type: ollama, model: 'mistral:instruct', url: 'https://models.local', timeout: 900000)"
echo "Output a JSON array with 15 cities where each entry has the 'city' name, the estimated population and the corresponding 'country'" | oafp input=llm output=json > data.json
oafp data.json output=ctable sql="select * order by population desc"
````

Result:
```
   city    │population│ country  
───────────┼──────────┼──────────
Shanghai   │270584000 │China     
Tokyo      │37436958  │Japan     
Delhi      │30290936  │India     
São Paulo  │21935296  │Brazil    
Beijing    │21516000  │China     
Mexico City│21402981  │Mexico    
Mumbai     │20712874  │India     
Cairo      │20636449  │Egypt     
Osaka      │19365701  │Japan     
Dhaka      │18568373  │Bangladesh
[#10 rows]
```

---

## 🥇 Advanced

### Creating ndjson file from json files

```bash
# Creates a data.ndjson file where each record is formatted from json files in /some/data 
find /some/data -name "*.json" -exec oafp {} output=json \; > data.ndjson
```

### Creating an XLSx file with multiple sheets

```bash
# Processes each json file in /some/data creating and updating the data.xlsx file with a sheet for each file 
find /some/data -name "*.json" | xargs -I '{}' /bin/sh -c 'oafp file={} output=xls xlsfile=data.xlsx xlsopen=false xlssheet=$(echo {} | sed "s/.*\/\(.*\)\.json/\1/g" )'
```