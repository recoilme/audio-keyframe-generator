// Secure math.js eval
math.import(
  {
    import: function () {
      throw new Error("Function import is disabled");
    },
    createUnit: function () {
      throw new Error("Function createUnit is disabled");
    },
    evaluate: function () {
      throw new Error("Function evaluate is disabled");
    },
    parse: function () {
      throw new Error("Function parse is disabled");
    },
    simplify: function () {
      throw new Error("Function simplify is disabled");
    },
    derivative: function () {
      throw new Error("Function derivative is disabled");
    },
  },
  { override: true }
);

// Set up audio context
window.AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();
let currentBuffer = null;

var analyser = audioContext.createAnalyser();

const body = document.querySelector("body");
const audio = document.querySelector("#audio");
const playback = document.querySelector("#playback");
const framerate = document.querySelector("#framerate");
framerate.value = 30;
const cadence = document.querySelector("#cadence");
cadence.value = 3;
const bmin = document.querySelector("#bmin");
bmin.value = 0.0;
const bmax = document.querySelector("#bmax");
bmax.value = 1.0;
const fn = document.querySelector("#fn");
fn.value = "x";
const ctx = document.getElementById('myChart').getContext('2d');

body.ondragover = body.ondragenter = function(evt) {
  evt.preventDefault();
};

body.ondrop = function(evt) {
  audio.files = evt.dataTransfer.files;
  evt.preventDefault();
  loadAudio(audio.files[0]);
  readFile(audio.files[0]);
};

audio.onchange = () => {loadAudio(audio.files[0]); readFile(audio.files[0]);};
framerate.onchange = () => {
  readFile(audio.files[0]);
};
fn.onchange = () => {
  readFile(audio.files[0]);
};
cadence.onchange = () => {
  readFile(audio.files[0]);
};
bmin.onchange = () => {
  readFile(audio.files[0]);
};
bmax.onchange = () => {
  readFile(audio.files[0]);
};
const output = document.querySelector("#output");
// output.onclick = () => {output.select()};
const copy = document.querySelector("#copy");

copy.onclick = () => {
  output.select();
  document.execCommand("copy");
};

let format = document.querySelector('[name="format"]')

format.onchange = () => {readFile(audio.files[0])};

let content = {};
let contentProxy = new Proxy(content, {
  set: function (target, key, value) {
    if (key == "base64") {
      play(value);
    }
    target[key] = value;
    return true;
  },
});

let decimalPrecision = 2;

function loadAudio(file) {
  playback.src = URL.createObjectURL(file);
  playback.load();
  playback.play();
}

function readFile(file) {
  const reader = new FileReader();
  reader.addEventListener("load", (event) => {
    contentProxy.base64 = event.target.result;
  });

  reader.addEventListener("progress", (event) => {
    if (event.loaded && event.total) {
      const percent = (event.loaded / event.total) * 100;
      console.log(`Upload progress: ${Math.round(percent)}`);
    }
  });
  reader.readAsDataURL(file);
}

function getString(arr) {
  let string = "";
  for (let ind of Object.keys(arr)) {
    let sample = arr[ind];
    string = string.concat(
      `${ind*cadence.value}: (${parseFloat(sample).toFixed(decimalPrecision)})`
    );
    if (parseInt(ind) < parseInt(arr.length - 1)) {
      string = string.concat(", ");
    }
  }
  return string;
}

function filterData(audioBuffer) {
  // let nChannels = audioBuffer.numberOfChannels;
  // let merger = new ChannelMergerNode(audioContext, {numberOfInputs: 1, channelCount: 1, channelCountMode: 'explicit'});
  // let audioBufferSourceNode = new AudioBufferSourceNode(audioContext, {buffer: audioBuffer})
  // audioBufferSourceNode.connect(merger, 0, 0);
  // console.log(merger);
  //   var analyser = audioContext.createAnalyser();
  //   analyser.fftSize = 2048;
  //   var bufferLength = analyser.frequencyBinCount;
  //   var dataArray = new Uint8Array(bufferLength);
  //   analyser.getByteTimeDomainData(dataArray);

  //   audioBufferSourceNode.connect(analyser);
  //   console.log(dataArray);
  //   audioBufferSourceNode.connect(audioContext.destination)

  // Average between channels. Take abs so we don't have phase issues (and we eventually want absolute value anyway, for volume).
  function addAbsArrayElements(a, b) {
    return a.map((e, i) => Math.abs(e) + Math.abs(b[i]));
  }
  let channels = [];
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }
  const rawData = channels
    .reduce(addAbsArrayElements)
    .map((x) => x / audioBuffer.numberOfChannels);
  // const rawData = audioBuffer.getChannelData(0); // We only need to work with one channel of data
  const samples = audioBuffer.duration * (framerate.value / cadence.value); //rawData.length; // Number of samples we want to have in our final data set
  const blockSize = Math.floor(rawData.length / samples); // Number of samples in each subdivision
  var filteredData = [];
  for (let i = 0; i < samples; i++) {
    let chunk = rawData.slice(i * blockSize, (i + 1) * blockSize - 1);
    let sum = chunk.reduce((a, b) => a + b, 0);
    filteredData.push(sum / chunk.length);
  }
  let amax = Math.max(...filteredData); // Normalise - maybe not ideal.
  let amin = Math.min(...filteredData);

  // const Parser = require('expr-eval').Parser;
  // const parser = new Parser();
  // let expr = parser.parse(fn.value);
  filteredData2 = structuredClone(filteredData)
  filteredData2 = filteredData2
  .map((x) => (x - amin)/ (amax- amin))
  .map((x) => (parseFloat(bmax.value) - parseFloat(bmin.value))*x+parseFloat(bmin.value))
  .map((x, ind) => math.eval(fn.value.replace("x", x).replace("y", ind)));
  var keys = Object.keys(filteredData2);
  var values = keys.map(function(v) { return filteredData2[v]; });
  var myChart = new Chart(ctx);
  removeData(myChart);
  myChart = new Chart(ctx, {
    type: "line",
    data: {
    labels: keys,
    datasets: [{
      fill: false,
      backgroundColor: "rgba(0,0,255,1.0)",
      borderColor: "rgba(0,0,255,0.1)",
      data: values
    }]
  }
  });

  filteredData = filteredData
    .map((x) => (x - amin)/ (amax- amin))
    .map((x) => (parseFloat(bmax.value)-parseFloat(bmin.value))*x+parseFloat(bmin.value))
    .map((x, ind) => math.eval(fn.value.replace("x", x).replace("y", ind)));
  let string = getString(filteredData);
  
  if (format.value == "pytti") {
    output.innerHTML = `(lambda builtins, fps, kf: kf[builtins["min"](kf, key = lambda x: builtins["abs"](x-(t*fps)//1))])([a for a in (1).__class__.__base__.__subclasses__() if a.__name__ == "catch_warnings"][0]()._module.__builtins__, ${framerate.value}, {${string}})`;
  } else if (format.value == "disco") {
    output.innerHTML = string;
  } else if ((format.value == "csv")) {
    var matches = string.matchAll(/\(([\-0-9.]+)\)/g)
    let CSVString = [... matches].map((e) => e[1]).join('\n')
    output.innerHTML = CSVString;
  }


  return filteredData;
}

function removeData(chart) {
  chart.data.labels.pop();
  chart.data.datasets.forEach((dataset) => {
      dataset.data.pop();
  });
  chart.update();
}

function play(base64) {
  fetch(base64)
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
    .then((audioBuffer) => filterData(audioBuffer));
  // let audio = new Audio(base64);
  // audio.play();

  // var source = audioContext.createMediaElementSource(audio);
  // source.connect(analyser);
  // source.connect(audioContext.destination);
  // var dataArray = new Uint8Array(analyser.frequencyBinCount);
  // analyser.getByteFrequencyData(dataArray);

  // console.log(dataArray);
  // console.log(analyser);
}
