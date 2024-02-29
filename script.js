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
var audioBuffer

const body = document.querySelector("body");
const audio = document.querySelector("#audio");
const playback = document.querySelector("#playback");
const framerate = document.querySelector("#framerate");
framerate.value = 12;
const cadence = document.querySelector("#cadence");
cadence.value = 1;
const gmin = document.querySelector("#gmin");
gmin.value = 0.03;
const bmin = document.querySelector("#bmin");
bmin.value = 0.45;
const bmax = document.querySelector("#bmax");
bmax.value = 0.65;
const fn = document.querySelector("#fn");
fn.value = "1-x";
const ctx = document.getElementById('myChart').getContext('2d');
const cmin = document.querySelector("#cmin");
cmin.value = 4;
const cmax = document.querySelector("#cmax");
cmax.value = 16;
const nmin = document.querySelector("#nmin");
nmin.value = 0.02;
const nmax = document.querySelector("#nmax");
nmax.value = 0.08;
const smin = document.querySelector("#smin");
smin.value = -0.25;
const smax = document.querySelector("#smax");
smax.value = 3;
nmax.value = 0.08;

const rmin = document.querySelector("#rmin");
rmin.value = 0.2;
const rmax = document.querySelector("#rmax");
rmax.value = 0.4;
const userFormula = document.querySelector("#userFormula");
userFormula.value = "Math.sin((2*3.14*frameNumber)/250)";

const minmulti = document.querySelector("#minmulti");
minmulti.value = 0.8;

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
gmin.onchange = () => {
  readFile(audio.files[0]);
};
bmin.onchange = () => {
  readFile(audio.files[0]);
};
bmax.onchange = () => {
  readFile(audio.files[0]);
};
const output = document.querySelector("#output");
const generate = document.querySelector("#generate");
const genoutput = document.querySelector("#genoutput");

generate.onclick = () => {
  result = ''
  const parsedData = parseFrameData(output.innerHTML);
  // Используем функцию:
  const minima = findMinima(parsedData, 50);

  const scaledData = applyMinimaScale(parsedData, minima, parseFloat(minmulti.value));

  result += "Prompt:\n" + JSON.stringify(minima);
  result += "\nStr:\n";
  result += convertDataToString(scaledData);

  const newScaledData = scaleToRange2(scaledData, parseFloat(cmin.value), parseFloat(cmax.value), true);
  result += "\nCfg:\n";
  result += convertDataToString(newScaledData);

  const speedData = scaleToRange2(scaledData, parseFloat(smin.value), parseFloat(smax.value), true);
  result += "\nTranslation Z:\n";
  result += convertDataToString(speedData);

  const noiseData = scaleToRange2(scaledData, parseFloat(nmin.value), parseFloat(nmax.value), false);
  result += "\nNoize:\n";
  result += convertDataToString(noiseData);

  //const userFormula = "Math.sin((2*3.14*frameNumber)/250)";
  const frameMultiplier = (frameNumber) => eval(userFormula.value)//Math.sin((2*3,14*frameNumber)/250)
  const rotData = scaleToRange(scaledData, parseFloat(rmin.value), parseFloat(rmax.value), false, frameMultiplier);
  result += "\nRotation:\n";
  result += convertDataToString(rotData);

  genoutput.innerHTML = result
  resizeTextEdit();
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

function applyMinimaScale(data, minima, scale) {
  
  return data.map(item => ({
    ...item,
    value: minima[item.frame] !== undefined ? minima[item.frame] * scale : item.value
  }));
}

function convertDataToString(data) {
  return data.map(item => `${item.frame}: (${item.value.toFixed(2)})`).join(', ');
}


function findMinima(data, framesPerGroup) {
  if (!Array.isArray(data) || data.length === 0) {
    return '{}';
  }

  let result = {};
  for (let i = 0; i < data.length; i += framesPerGroup) {
    // Найдем два минимальных значения в группе
    let group = data.slice(i, i + framesPerGroup);
    let minValues = group
      .sort((a, b) => a.value - b.value)
      .slice(0, 2);

    // Добавим их в результат
    minValues.forEach(item => {
      result[item.frame] = item.value;
    });
  }

  return result;
}


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
      //console.log(`Upload progress: ${Math.round(percent)}`);
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


function filterData(audioBuffer2) {
  audioBuffer = audioBuffer2

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
  let amin = 10000000.0;
  let prev = 0.0;
  for (let i = 0; i < samples; i++) {
    let chunk = rawData.slice(i * blockSize, (i + 1) * blockSize - 1);
    let sum = chunk.reduce((a, b) => a + b, 0);
    if (sum / chunk.length < parseFloat(gmin.value)) {
      if (amin >= 10000000.0) {
        filteredData.push(parseFloat(gmin.value));
      } else {
        filteredData.push(amin);
      }
    } else {
      filteredData.push(sum / chunk.length);
      if ((sum / chunk.length)<amin) {
        amin = sum / chunk.length
      }
      prev = sum / chunk.length
    }
  }
  let amax = Math.max(...filteredData);
  filteredData = filteredData
    .map((x) => (x<=parseFloat(amin.value)?amin:x));

  filteredData = filteredData
    .map((x) => (x - amin)/ (amax- amin))
    .map((x, ind) => math.eval(fn.value.replace("x", x).replace("y", ind)))
    .map((x) => (parseFloat(bmax.value)-parseFloat(bmin.value))*x+parseFloat(bmin.value))

    //.map((x) => (x<parseFloat(bmin.value)?(parseFloat(bmin.value)+parseFloat(bmax.value))/2:x));
  filteredData2 = structuredClone(filteredData)
 
  
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
}

function parseFrameData(dataStr) {
  if (!dataStr) {
    console.log('Сюрприз! Строка пуста как кошелек после Черной пятницы.');
    return [];
  }

  return dataStr.split(', ').map(item => {
    const match = item.match(/(\d+): \(([\d.]+)\)/);
    return match ? { frame: parseInt(match[1], 10), value: parseFloat(match[2]) } : null;
  }).filter(Boolean);
}

function resizeTextEdit() {

  const textEdit = document.querySelector("#genoutput");
  // Сначала для высоты - чтобы текстовое поле подстраивалось под содержимое
  textEdit.style.height = 'auto'; // Сбросим текущую высоту
  textEdit.style.height = `${textEdit.scrollHeight}px`; // устанавливаем высоту равной полной высоте контента
}

function scaleToRange(data, newMin, newMax, invert = false, formula = (x) => x) {
  const currentMin = Math.min(...data.map(item => item.value));
  const currentMax = Math.max(...data.map(item => item.value));
  
  return data.map(item => {
    let normalized = (item.value - currentMin) / (currentMax - currentMin);
    normalized = invert ? 1 - normalized : normalized;
    let scaledValue = normalized * (newMax - newMin) + newMin;
    console.log(scaledValue,formula(item.frame))
    scaledValue2 = formula(item.frame) * scaledValue; // Умножаем на результат формулы
    return {
      ...item,
      value: scaledValue2
    };
  });
}

function scaleToRange2(data, newMin, newMax, invert = false) {
  const currentMin = Math.min(...data.map(item => item.value));
  const currentMax = Math.max(...data.map(item => item.value));
  
  return data.map(item => {
    let normalized = (item.value - currentMin) / (currentMax - currentMin);
    normalized = invert ? 1 - normalized : normalized; // Если надо инвертировать, то просто вычитаем из 1
    const scaledValue = normalized * (newMax - newMin) + newMin;
    return {
      ...item,
      value: scaledValue//invert ? newMax + newMin - scaledValue : scaledValue // Это для инверсии крайних значений
    };
  });
}