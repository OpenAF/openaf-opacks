# Prolog

## Usage

_tbc_

## oJob usage

Including "prolog.yaml" will add support for the prolog language:

````yaml
include:
- prolog.yaml

jobs:
# -----------
- name: Debug
  exec: |
    yprint(args.result);

# ----------------
- name: Test array
  to  : Debug
  lang: prolog
  args:
    knowledge:
    - brand     : BMW
      isCarMaker: true
      isGerman  : true
    - brand     : Mercedes
      isCarMaker: true
      isGerman  : true
    - brand     : Tesla
      isCarMaker: true
      isGerman  : false
    knowledgeKey: brand
  exec: kl_isCarMaker(Brand, 'true'), kl_isGerman(Brand, 'true').

# --------------
- name: Test map
  to  : Debug
  lang: prolog
  args:
    knowledge   :
      language: prolog
      type    : logical
    knowledgeKey: language
  exec: kl_type('prolog', 'logical').

todo:
- Test array
- Test map
````