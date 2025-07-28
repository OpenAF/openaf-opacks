# SocksServer

A high-performance SOCKS proxy server for OpenAF with advanced filtering capabilities, comprehensive metrics, and IPv4/IPv6 support.

## Features

- **High Performance**: Optimized CIDR matching with pre-compiled filters and intelligent caching
- **IPv4 & IPv6 Support**: Full support for both IPv4 and IPv6 addresses and CIDR filtering
- **Advanced Filtering**: IP CIDR, hostname suffix, and ASN-based filtering with invertible logic
- **Comprehensive Metrics**: Built-in metrics
- **Cache Management**: Intelligent caching with configurable TTL and automatic invalidation
- **ASN Filtering**: Geographic and network-based filtering using ASN databases
- **Flexible Logging**: Configurable logging levels with audit trail support

## Quick Start

### Simple with no logging

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()
ss.start(10080)
ss.stop()
````

### With basic logging

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()
ss.start(10080, ss.getLogCallback(true))
ss.stop()
````

### With detailed logging

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()
ss.start(10080, ss.getLogCallback(true, true, true))
ss.stop()
````

## Filtering Examples

### Private Networks Only (IPv4 + IPv6)

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()
ss.start(10080, ss.getLocalNetCallback())
ss.stop()
````

### Custom CIDR Filtering (IPv4 + IPv6)

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()
var ipFilters = ["10.0.0.0/8", "192.168.0.0/16", "fc00::/7", "2001:db8::/32"]
var hostFilters = [".internal.com", ".local"]
ss.start(10080, ss.getCallback(ss.getNetFilter(ipFilters, hostFilters), true))
ss.stop()
````

### ASN-Based Filtering

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()

// Update ASN index (do this periodically, e.g., daily)
ss.updateASNIdx()

// Allow only specific ASNs (e.g., AWS, Google Cloud)
var asnFilter = [16509, 15169, 13335]  // AWS, Google, Cloudflare
var filter = ss.getNetFilter([], [], asnFilter)
ss.start(10080, ss.getCallback(filter, true))
ss.stop()
````

### Inverted Filtering (Block specific networks)

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()
var blockedNetworks = ["192.168.100.0/24", "10.0.50.0/24"]
var filter = ss.getNetFilter(blockedNetworks, [], [], true) // shouldInvert=true
ss.start(10080, ss.getCallback(filter, true))
ss.stop()
````

## Advanced Configuration

### Custom Cache TTL and Worker Threads

````javascript
loadLib("socksServer.js")
var cacheTTL = 300000  // 5 minutes
var workers = 10       // 10 worker threads
var ss = new SocksServer(cacheTTL, workers)
ss.start(10080)
````

### Performance Monitoring

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()
ss.start(10080, ss.getLocalNetCallback())

// Get detailed metrics
var metrics = ss.getMetrics()
print("Cache size: " + metrics.summary.totalCacheEntries)
print("Memory usage: " + metrics.performance.cacheMemoryEstimateKB + " KB")
print("Health status: " + metrics.summary.overallHealth)

// Get Prometheus format metrics
var prometheusMetrics = ss.getPrometheusMetrics()
print(prometheusMetrics)

// Get cache statistics
var cacheStats = ss.getCacheStats()
print("Filter cache: " + cacheStats.filterCacheSize + " entries")
print("ASN cache: " + cacheStats.asnCacheSize + " entries")
print("Cache age: " + cacheStats.cacheAgeHours + " hours")
````

## Cache Management

### Manual Cache Control

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()

// Clear all caches manually
ss.clearCaches()

// Clear all caches including compiled filters
ss.clearCaches(true)

// Get current cache statistics
var stats = ss.getCacheStats()
````

### ASN Index Management

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()

// Download and update ASN index from default URL
ss.updateASNIdx()

// Download from custom URL
ss.updateASNIdx("https://example.com/custom-asn-index.json.gz")

// Create your own ASN index file
ss.createIP2ASNIndex("my-asn-index.json.gz")

// Load ASN index from file
ss.getIP2ASNIndex("my-asn-index.json.gz")

// Look up ASN for specific IP
var asnInfo = ss.asnIndexIP2ASN("8.8.8.8", ss._aidx)
print("ASN: " + asnInfo.a)  // ASN number
````

## API Reference

### Constructor

- `new SocksServer(cacheTTL, numberOfWorkers)` - Create new instance with optional cache TTL (ms) and worker count

### Core Methods

- `start(port, callback)` - Start SOCKS server on specified port
- `stop()` - Stop the server
- `getCallback(filterFunc, verboseLog, detailLog, includeStackTrace)` - Get callback with custom filter
- `getLogCallback(verboseLog, detailLog, includeStackTrace)` - Get logging-only callback
- `getLocalNetCallback(verboseLog, detailLog, includeStackTrace)` - Get private network filter callback

### Filtering Methods

- `getNetFilter(ipFilters, hostFilters, asnFilter, shouldInvert)` - Create network filter
- `getLocalNetFilter()` - Create private network filter (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7)

### Cache & Performance

- `getCacheStats()` - Get current cache statistics
- `getMetrics()` - Get comprehensive server metrics
- `getPrometheusMetrics()` - Get metrics in Prometheus format
- `clearCaches(clearCompiledFilters)` - Manually clear caches

### ASN Management

- `updateASNIdx(url)` - Download and update ASN index
- `getIP2ASNIndex(file)` - Load ASN index from file
- `createIP2ASNIndex(file, cache, logFn)` - Create ASN index file
- `asnIndexIP2ASN(ip, aidx)` - Look up ASN for IP address
- `asnIndexASN2IP(asn, aidx)` - Look up IP ranges for ASN

## Performance Features

- **Pre-compiled CIDR Filters**: Filters are compiled once and cached for repeated use
- **Integer-based IPv4 Matching**: Ultra-fast bitwise operations for IPv4 CIDR matching
- **Byte-array IPv6 Matching**: Efficient byte-level comparison for IPv6 addresses
- **Set-based ASN Lookup**: O(1) ASN filter matching using JavaScript Sets
- **Intelligent Caching**: Multiple cache layers with automatic invalidation
- **Atomic Counters**: Thread-safe metrics collection with turnaround handling

## IPv6 Support

The SocksServer fully supports IPv6 addresses and CIDR notation:

- **IPv6 CIDR**: `2001:db8::/32`, `fc00::/7`, `::1/128`
- **Compressed notation**: `::1`, `2001:db8::1`
- **Mixed IPv4/IPv6**: `::ffff:192.168.1.1`
- **Dual-stack filtering**: Mix IPv4 and IPv6 filters in the same filter list

Example IPv6 filters:
````javascript
var ipv6Filters = [
    "fc00::/7",           // Private IPv6 networks
    "2001:db8::/32",      // Documentation range
    "::1/128",            // IPv6 localhost
    "fe80::/10"           // Link-local addresses
]
````

## Monitoring & Alerting

### Health Checks

The `getMetrics()` method provides health indicators:

- `health.cacheHealthy` - Cache is refreshing properly
- `health.asnIndexHealthy` - ASN index is loaded and available
- `health.memoryHealthy` - Memory usage is within reasonable limits
- `health.configurationValid` - Server configuration is valid

### Key Metrics

- Request counters with atomic thread-safety
- Error tracking and categorization
- Cache hit ratios and efficiency metrics
- Memory usage estimation
- ASN index status and age

## Best Practices

1. **Cache TTL**: Set appropriate cache TTL based on your network change frequency (default: 60 seconds)
2. **ASN Updates**: Update ASN index daily for accurate geolocation filtering
3. **Monitoring**: Use `getPrometheusMetrics()` for integration with monitoring systems
4. **IPv6 Ready**: Include IPv6 CIDR ranges in your filters for future-proofing
5. **Performance**: Use `getMetrics()` to monitor cache efficiency and adjust TTL if needed
6. **Security**: Combine IP, hostname, and ASN filters for comprehensive access control

## Troubleshooting

### Check Server Status
````javascript
var metrics = ss.getMetrics()
if (!metrics.server.isRunning) {
    print("Server is not running")
}
````

### Cache Performance
````javascript
var stats = ss.getCacheStats()
if (stats.filterCacheSize === 0) {
    print("No requests processed yet or cache expired")
}
````

### ASN Index Issues
````javascript
var metrics = ss.getMetrics()
if (!metrics.health.asnIndexHealthy) {
    print("ASN index not loaded - call ss.updateASNIdx()")
}
````