#import <Foundation/Foundation.h>
#import <Metal/Metal.h>
#include <stdint.h>
#include <stdio.h>

// C ABI owns retained Objective-C handles. Java serializes all calls per service.
static void message(char *out, int size, NSString *value) {
  if (out && size > 0) snprintf(out, size, "%s", value.UTF8String ?: "Metal failure");
}
void *gpu_metal_create(char *error, int size) {
  @autoreleasepool {
    id<MTLDevice> device = MTLCreateSystemDefaultDevice();
    if (!device) { message(error, size, @"No Metal device"); return NULL; }
    return (__bridge_retained void *)device;
  }
}
void gpu_metal_name(void *handle, char *out, int size) {
  @autoreleasepool { message(out, size, [(__bridge id<MTLDevice>)handle name]); }
}
uint64_t gpu_metal_max_allocation(void *handle) {
  @autoreleasepool { return [(__bridge id<MTLDevice>)handle maxBufferLength]; }
}
void gpu_metal_release(void *handle) {
  if (handle) { @autoreleasepool { id object = CFBridgingRelease(handle); (void)object; } }
}
void *gpu_metal_compile(void *handle, const char *source, char *error, int size) {
  @autoreleasepool {
    @try {
    NSError *failure = nil;
    MTLCompileOptions *options = [MTLCompileOptions new];
    if (@available(macOS 15.0, *)) options.mathMode = MTLMathModeSafe;
    else {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
      options.fastMathEnabled = NO;
#pragma clang diagnostic pop
    }
    id<MTLLibrary> library = [(__bridge id<MTLDevice>)handle newLibraryWithSource:[NSString stringWithUTF8String:source] options:options error:&failure];
    if (!library) { message(error, size, failure.localizedDescription); return NULL; }
    id<MTLFunction> function = [library newFunctionWithName:@"calculate"];
    if (!function) { message(error, size, @"Missing calculate kernel"); return NULL; }
    id<MTLComputePipelineState> pipeline = [(__bridge id<MTLDevice>)handle newComputePipelineStateWithFunction:function error:&failure];
    if (!pipeline) { message(error, size, failure.localizedDescription); return NULL; }
    return (__bridge_retained void *)pipeline;
    } @catch (NSException *failure) {
      message(error, size, failure.reason); return NULL;
    }
  }
}
// Every output buffer is private. Copy back only after successful completion.
int gpu_metal_execute(void *handle, void *kernel, void **values, const int *arrays,
                      int count, int output, int length, char *error, int size) {
  @autoreleasepool {
    @try {
    id<MTLDevice> device = (__bridge id<MTLDevice>)handle;
    id<MTLComputePipelineState> pipeline = (__bridge id<MTLComputePipelineState>)kernel;
    if (count <= 0 || output < 0 || output >= count || length <= 0) return -1;
    NSUInteger bytes = (NSUInteger)length * 4;
    NSMutableArray *buffers = [NSMutableArray arrayWithCapacity:count];
    id<MTLCommandQueue> queue = [device newCommandQueue];
    id<MTLCommandBuffer> command = [queue commandBuffer];
    id<MTLComputeCommandEncoder> encoder = [command computeCommandEncoder];
    if (!encoder) { message(error, size, @"Cannot allocate Metal command encoder"); return -1; }
    [encoder setComputePipelineState:pipeline];
    for (int i = 0; i < count; i++) {
      if (arrays[i]) {
        id<MTLBuffer> buffer = [device newBufferWithLength:bytes options:MTLResourceStorageModeShared];
        if (!buffer) { [encoder endEncoding]; message(error, size, @"Cannot allocate Metal buffer"); return -1; }
        if (i != output) memcpy(buffer.contents, values[i], bytes);
        [buffers addObject:buffer];
        [encoder setBuffer:buffer offset:0 atIndex:i];
      } else {
        [buffers addObject:[NSNull null]];
        [encoder setBytes:values[i] length:4 atIndex:i];
      }
    }
    NSUInteger width = MIN(pipeline.maxTotalThreadsPerThreadgroup, pipeline.threadExecutionWidth);
    [encoder dispatchThreads:MTLSizeMake(length, 1, 1) threadsPerThreadgroup:MTLSizeMake(width, 1, 1)];
    [encoder endEncoding];
    [command commit];
    [command waitUntilCompleted];
    if (command.status != MTLCommandBufferStatusCompleted) {
      message(error, size, command.error.localizedDescription); return -1;
    }
    memcpy(values[output], [(id<MTLBuffer>)buffers[output] contents], bytes);
    return 0;
    } @catch (NSException *failure) {
      message(error, size, failure.reason); return -1;
    }
  }
}
