# OpenAF processor examples

## Advanced

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