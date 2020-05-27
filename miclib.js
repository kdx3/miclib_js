//2020-02-07

class MicLib {

  constructor(bufferSize = 16384, nInChannels = 1, nOutChannels = 1, gainValue = 1) {

    this.mScriptProcessorNodeOutput = false;
    this.mStreamSrcNode = null;
    this.mBufferSize = bufferSize;
    this.mInChannels = nInChannels;
    this.mOutChannels = nOutChannels;
    this.mMicDevId = "default";
    this.mScriptProcessorNodeFunction = null;
    this.mInputDevList = []
    this.mLastError = null;

    if (navigator) {
      navigator.mediaDevices.ondevicechange = (event) => {
        this.refreshInputDevList();
      }
    }

    let AudioContext = window.AudioContext || window.webkitAudioContext;
    this.mAudioContext = new AudioContext;

    this.mGainNode = this.mAudioContext.createGain();
    this.mGainNode.gain.value = gainValue;

    this.mScriptProcessorNode = this.mAudioContext.createScriptProcessor(
      this.mBufferSize,
      this.mInChannels,
      this.mOutChannels,
    );

    this.mAnalyserNode = this.mAudioContext.createAnalyser();
    this.mAnalyseFlag = false;

    this.mAnalyserData = new Uint8Array(this.mAnalyserNode.frequencyBinCount);
    this.mAnalyserCanvas = null;

    var instance = this;
    this.mScriptProcessorNode.onaudioprocess = function(event) {
      var buffers = [];
      for (var i = 0; i < instance.mInChannels; ++i) {
        buffers[i] = event.inputBuffer.getChannelData(i);
      }
      if (instance.mAnalyseFlag == false) {
        instance.mScriptProcessorNodeFunction(buffers);
      }
      if (instance.mScriptProcessorNodeOutput) {
        var inputBuffer = event.inputBuffer;
        var outputBuffer = event.outputBuffer;
        for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
          var inputData = inputBuffer.getChannelData(channel);
          var outputData = outputBuffer.getChannelData(channel);
          for (var sample = 0; sample < inputBuffer.length; sample++) {
            outputData[sample] = inputData[sample];
          }
        }
      }
    }

  }

  set lastError(error) {
    this.mLastError = error;
  }

  get lastError() {
    return this.mLastError;
  }

  set analyserFlag(flag) {
    this.mAnalyseFlag = flag;
  }

  get analyserFlag() {
    return this.mAnalyseFlag;
  }

  get analyserNode() {
    return this.mAnalyserNode;
  }

  set analyserCanvas(analyserCanvas) {
    this.mAnalyserCanvas = analyserCanvas;
  }

  drawBasicCanvas() {
    if (this.mAnalyserCanvas != null) {
      var canvasCtx = this.mAnalyserCanvas.getContext("2d");
      canvasCtx.fillStyle = "rgb(200, 200, 200)";
      canvasCtx.fillRect(0, 0, this.mAnalyserCanvas.width, this.mAnalyserCanvas.height);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "rgb(0, 0, 0)";
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, this.mAnalyserCanvas.height / 2);
      canvasCtx.lineTo(this.mAnalyserCanvas.width, this.mAnalyserCanvas.height / 2);
      canvasCtx.stroke();
    }
  }

  drawSoundData(ts) {
    var bufferLength = this.mAnalyserNode.frequencyBinCount;
    this.mAnalyserNode.getByteTimeDomainData(this.mAnalyserData);
    requestAnimationFrame((ts) => this.drawSoundData(ts));

    if (this.mAnalyserCanvas != null) {
      var canvasCtx = this.mAnalyserCanvas.getContext("2d");
      canvasCtx.fillStyle = "rgb(200, 200, 200)";
      canvasCtx.fillRect(0, 0, this.mAnalyserCanvas.width, this.mAnalyserCanvas.height);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "rgb(0, 0, 0)";

      canvasCtx.beginPath();

      var sliceWidth = this.mAnalyserCanvas.width * 1.0 / bufferLength;
      var x = 0;

      for (var i = 0; i < bufferLength; i++) {
        var v = this.mAnalyserData[i] / 128.0;
        var y = v * this.mAnalyserCanvas.height / 2;
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      canvasCtx.lineTo(this.mAnalyserCanvas.width, this.mAnalyserCanvas.height / 2);
      canvasCtx.stroke();
    }

  }

  isInit() {
    return this.mAudioContext != null 
      && this.mStreamSrcNode != null 
      && this.mGainNode != null 
      && this.mAnalyserNode != null 
      && this.mScriptProcessorNode != null;
  }

  start() {
    if (this.isInit()) {
      this.mAudioContext.resume();
      if (this.mAnalyseFlag == false) {
        this.mStreamSrcNode.connect(this.mGainNode);
      } else {
        this.mStreamSrcNode.connect(this.mAnalyserNode);
        this.mAnalyserNode.connect(this.mGainNode);
        this.drawSoundData(0);
      }
      this.mGainNode.connect(this.mScriptProcessorNode);
      this.mScriptProcessorNode.connect(this.mAudioContext.destination);
      return true;
    }
    return false;
  }

  stop() {
    if (this.isInit()) {
      this.mScriptProcessorNode.disconnect();
      this.mGainNode.disconnect();
      if (this.mAnalyseFlag) {
        this.mAnalyserNode.disconnect();
      }
      this.mStreamSrcNode.disconnect();
      return true;
    }
    return false;
  }

  createMicStreamSrcNodeCallback(micStream) {
    this.streamSrcNode = { 'node': this.mAudioContext.createMediaStreamSource(micStream), 'echo' : this.mScriptProcessorNodeOutput };
  }

  createMicStreamSrcNode(micEcho = false) {
    this.mScriptProcessorNodeOutput = micEcho;
    if (navigator) {
      navigator.mediaDevices
        .getUserMedia({ audio: {deviceId: this.mMicDevId}, video: false })
        .then((micStream) => this.createMicStreamSrcNodeCallback(micStream))
        .catch((error) => { this.mLastError = error; });
    }
  }

  createFileStreamSrcNode(mediaElement) {
    return { 'node' : this.mAudioContext.createMediaElementSource(mediaElement), 'echo' : true };
  }

  set streamSrcNode(streamSrcNode) {
    if (streamSrcNode != null) {
      this.mStreamSrcNode = streamSrcNode.node;
      this.mScriptProcessorNodeOutput = streamSrcNode.echo;
    }
  }

  get streamSrcNode() {
    return this.mStreamSrcNode;
  }

  set scriptProcessorNodeFunction(nodeFunction) {
    this.mScriptProcessorNodeFunction = nodeFunction;
  }

  get scriptProcessorNodeFunction() {
    return this.mScriptProcessorNodeFunction;
  }

  get sampleRate() {
    return this.mAudioContext.sampleRate;
  }

  set micDevId(micDevId) {
    this.mMicDevId = micDevId;
  }

  get micDevId() {
    return ths.mMicDevId;
  }

  refreshInputDevList() {
    if (navigator) {
      navigator.mediaDevices.enumerateDevices()
        .then( (devices) => {
          devices.forEach( (device) => {
            if (device.kind == "audioinput") {
              this.mInputDevList.push(device.deviceId);
            }
          });
        }).catch( (error) => {
          this.mLastError = error
        });
    }
  }

  get inputDevList() {
    return this.mInputDevList;
  }

};

if (typeof(module) != "undefined" && typeof(module.exports) != "undefined") {
  module.exports = MicLib;
}
