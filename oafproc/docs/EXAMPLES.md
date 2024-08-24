# OpenAF processor examples

## 🥉 Basic

### OUTPUT JSON: Creating ndjson file from json files

**Command:**
```bash
# Creates a data.ndjson file where each record is formatted from json files in /some/data 
find /some/data -name "*.json" -exec oafp {} output=json \; > data.ndjson
```

### FILTER PATH: Manipulate text in a field

**Command:**
```bash
# Get a json with the lyrics of a song
curl -s https://api.lyrics.ovh/v1/Coldplay/Viva%20La%20Vida | oafp path="substring(lyrics,index_of(lyrics, '\n'),length(lyrics))"
```

**Results:**
```
I used to rule the world
[...]
Oooooh Oooooh Oooooh
```

### FILTER PATH: Docker ps formatting

**Command:**
```bash
oafp cmd="docker ps --format json" input=ndjson ndjsonjoin=true path="[].{id:ID,name:Names,state:State,image:Image,networks:Networks,ports:Ports,Status:Status}" sql="select * order by networks,state,name" output=ctable
```

**Result:**
```
     id     │          name          │ state │            image             │       networks       │                         ports                         │  Status  
────────────┼────────────────────────┼───────┼──────────────────────────────┼──────────────────────┼───────────────────────────────────────────────────────┼──────────
af3adb5b8349│registry                │running│registry:2                    │bridge,k3d-k3s-default│0.0.0.0:5000->5000/tcp                                 │Up 2 hours
cba6e3807b44│k3d-k3s-default-server-0│running│rancher/k3s:v1.27.4-k3s1      │k3d-k3s-default       │                                                       │Up 2 hours
b775ad480764│k3d-k3s-default-serverlb│running│ghcr.io/k3d-io/k3d-proxy:5.6.0│k3d-k3s-default       │80/tcp, 0.0.0.0:1080->1080/tcp, 0.0.0.0:45693->6443/tcp│Up 2 hours
[#3 rows]
```

### ASK: Interactively ask questions

**Command:**
```bash
oafp in=ask 
[
    (name: simple, prompt: "What is your name? ", type: question) |
    (name: secret, prompt: "Write a secret word: ", type: secret) |
    (name: option, prompt: "Which color you like best? ", type: choose, options: [ "blue" | "green" | "red" ]) |
    (name: multiple, prompt: "Choose the numbers you like more: ", type: multiple, options: [ "One" | "Two" | "Three" ], output: index, max: 2) |
    (name: char, prompt: "Did you like this? (Y/N)", type: char, options: YNyn)
]
```

The resull will be an array with 'name' and the corresponding 'answer'.

## 🥈 Medium

### FILTER PATH: Kubectl get pods formatting

**Command:**
```bash
oafp cmd="kubectl get pods -A -o json" path="items[].{ns:metadata.namespace,kind:metadata.ownerReferences[].kind,name:metadata.name,status:status.phase,restarts:sum(status.containerStatuses[].restartCount),node:spec.nodeName,age:timeago(status.startTime)}" sql="select * order by status,name" output=ctable
```

**Result:**
```
    ns     │   kind   │                 name                 │ status  │restarts│          node          │     age      
───────────┼──────────┼──────────────────────────────────────┼─────────┼────────┼────────────────────────┼──────────────
kube-system│ReplicaSet│coredns-77ccd57875-5m44t              │Running  │0       │k3d-k3s-default-server-0│66 minutes ago
kube-system│ReplicaSet│local-path-provisioner-957fdf8bc-24hmf│Running  │0       │k3d-k3s-default-server-0│66 minutes ago
kube-system│ReplicaSet│metrics-server-648b5df564-hzbwb       │Running  │0       │k3d-k3s-default-server-0│66 minutes ago
kube-system│ReplicaSet│socks-server-d7c8c4d78-r6jc9          │Running  │0       │k3d-k3s-default-server-0│66 minutes ago
kube-system│DaemonSet │svclb-socks-server-78b973ca-zvf58     │Running  │0       │k3d-k3s-default-server-0│66 minutes ago
kube-system│DaemonSet │svclb-traefik-e1776788-7z2gf          │Running  │0       │k3d-k3s-default-server-0│66 minutes ago
kube-system│ReplicaSet│traefik-64f55bb67d-g2vps              │Running  │0       │k3d-k3s-default-server-0│66 minutes ago
kube-system│Job       │helm-install-traefik-6j5zx            │Succeeded│1       │k3d-k3s-default-server-0│66 minutes ago
kube-system│Job       │helm-install-traefik-crd-z59fs        │Succeeded│0       │k3d-k3s-default-server-0│66 minutes ago
[#9 rows]
```

### FILTER PATH:

**Command:**
```bash
oafp cmd="kubectl get nodes -o json" path="items[].{node:metadata.name,totalCPU:status.capacity.cpu,allocCPU:status.allocatable.cpu,totalMem:to_bytesAbbr(from_bytesAbbr(status.capacity.memory)),allocMem:to_bytesAbbr(from_bytesAbbr(status.allocatable.memory)),totalStorage:to_bytesAbbr(from_bytesAbbr(status.capacity.\"ephemeral-storage\")),allocStorage:to_bytesAbbr(to_number(status.allocatable.\"ephemeral-storage\")),conditions:join(\`, \`,status.conditions[].reason)}" output=ctable
```

**Result:**
```bash
          node          │totalCPU│allocCPU│totalMem│allocMem│totalStorage│allocStorage│                                        conditions                                         
────────────────────────┼────────┼────────┼────────┼────────┼────────────┼────────────┼───────────────────────────────────────────────────────────────────────────────────────────
k3d-k3s-default-server-0│4       │4       │3.85 GB │3.85 GB │77.6 GB     │73.8 GB     │KubeletHasSufficientMemory, KubeletHasNoDiskPressure, KubeletHasSufficientPID, KubeletReady
[#1 row]
```

### INPUT LLM: Using a LLM to generate a table

Setting up the LLM model and gather the data into a data.json file:

**Command:**
```bash
export OAFP_MODEL="(type: openai, model: gpt-3.5-turbo, key: ..., timeout: 900000)"
echo "list all United Nations secretaries with their corresponding 'name', their mandate 'begin date', their mandate 'end date' and their corresponding secretary 'numeral'" | oafp input=llm output=json > data.json
```

Checking the obtain data:

**Result:**
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

**Result:**
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

### TRANSFORM LLM: Using a LLM to transform an input

Using the data gather in ['Using a LLM to generate a table'](#using-a-llm-to-generate-a-table) use a LLM to transform it:

**Command:**
```bash
export OAFP_MODEL="(type: openai, model: gpt-3.5-turbo, key: ..., timeout: 900000)"
oafp data.json llmprompt="convert the numeral number into a roman number" path=secretaries output=ctable
```

**Result:**
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

### INPUT LLM: Using a private LLM to generate sample data

**Command:**
```bash
export OAFP_MODEL="(type: ollama, model: 'mistral:instruct', url: 'https://models.local', timeout: 900000)"
echo "Output a JSON array with 15 cities where each entry has the 'city' name, the estimated population and the corresponding 'country'" | oafp input=llm output=json > data.json
oafp data.json output=ctable sql="select * order by population desc"
````

**Result:**
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

### OUTPUT XLS: Creating an XLSx file with multiple sheets

**Command:**
```bash
# Processes each json file in /some/data creating and updating the data.xlsx file with a sheet for each file 
find /some/data -name "*.json" | xargs -I '{}' /bin/sh -c 'oafp file={} output=xls xlsfile=data.xlsx xlsopen=false xlssheet=$(echo {} | sed "s/.*\/\(.*\)\.json/\1/g" )'
```