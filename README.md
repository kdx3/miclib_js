# MICLIB.JS
## JavaScript Library For Microphone Management

### MicLib creates an audio processing pipeline, using browser's Media Streams API. 

The pipeline consists of following parts:
* input node; (either an audio streaming node or a media element source);
* gain node;
* analyser node; (optional)
* script processing node. (can forward audio to an output device)

### Usage Example:
```javascript
  let miclib = new MicLib();
  miclib.createMicStreamSrcNode(false);
  miclib.start(); //start capturing from an input device
```

### Examples:
To deploy example.html use any http server, e.g.: python -m http.server 8080. Https support is required to serve requests from remote hosts.
