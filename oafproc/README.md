# OpenAF processor

Takes an input, usually a data structure such as json, and transforms it to an equivalent data structure in another format or visualization. The output data can be filtered through JMESPath, SQL or OpenAF's nLinq and provided transformers can also be applied to it.

## Installing

```bash
opack install oafproc
```

After install you can check more by executing:

```bash
oafp -h
oafp help=filters
oafp help=template
```

> The 'oafp' command is usually installed in the OpenAF main folder.

## Examples

```bash
# simple processing through pipe
cat someJsonFile.json | oafp

# simple processing through pipe with scrolling
cat someJsonFile.json | oafp output=ctree | less -r

# specifying the input type and output format
cat data.ndjson | oafp input=ndjson output=cslon
```

```bash
# markdown parsing of a file
oafp file=someFile.md input=md

# table with the latest news from Google
curl -L https://blog.google/rss | oafp path="rss.channel.item" sql="select title, pubDate" output=ctable

# table with the number of people in space per space craft
curl http://api.open-notify.org/astros.json | oafp path="people" sql="select \"craft\", count(1) \"people\" group by \"craft\"" output=ctable

# markdown table with the current closest asteroids to earth
curl "https://api.nasa.gov/neo/rest/v1/feed?API_KEY=DEMO_KEY" | oafp path="near_earth_objects" maptoarray=true output=json | oafp path="[0][].{name:name,magnitude:absolute_magnitude_h,hazardous:is_potentially_hazardous_asteroid,distance:close_approach_data[0].miss_distance.kilometers}" sql="select * order by distance" output=mdtable
```

## See more

Check the main [usage documentation](docs/USAGE.md).

Additional documentation:

* [Filters](docs/FILTERS.md)
* [Template](docs/TEMPLATE.md)
* [Examples](src/docs/EXAMPLES.md)