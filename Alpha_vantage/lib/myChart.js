"use strict";

class BarChart {
  #chartOptions = {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Valore Registrato",
          data: [],
          backgroundColor: [],
          borderColor: "#00f3ff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      scales: {},
      plugins: {
        title: {
          display: true,
          text: "Main Title",
          font: { size: 20, weight: "bold", family: "Arial" },
          color: "#00f3ff",
        },
        legend: { display: false, labels: { color: "#ffffff" } },
      },
      responsive: true,
      aspectRatio: true,
      maintainAspectRatio: false,
    },
  };

  setChartType(type) {
    // Mappa i tipi personalizzati ai tipi reali di Chart.js
    if (type === "stackedBar") {
      this.#chartOptions.type = "bar";
    } else if (type === "horizontalBar") {
      this.#chartOptions.type = "bar";
      this.#chartOptions.options.indexAxis = "y";
    } else {
      this.#chartOptions.type = type;
    }

    if (!this.#chartOptions.options.scales) {
      this.#chartOptions.options.scales = {};
    }

    if (type === "pie" || type === "doughnut") {
      delete this.#chartOptions.options.scales.x;
      delete this.#chartOptions.options.scales.y;
      delete this.#chartOptions.options.scales.r;
    } else if (type === "polarArea") {
      delete this.#chartOptions.options.scales.x;
      delete this.#chartOptions.options.scales.y;
      this.#chartOptions.options.scales.r = {
        display: true,
        ticks: {
          showLabelBackdrop: false,
          color: "#00ffaa",
          font: { weight: "bold" },
        },
        grid: { color: "rgba(0, 243, 255, 0.2)" },
        angleLines: { color: "rgba(0, 243, 255, 0.2)" },
        pointLabels: { color: "#ffffff", font: { size: 13, weight: "bold" } },
      };
    } else if (type === "line") {
      delete this.#chartOptions.options.scales.r;
      this.#chartOptions.options.scales.x = {
        display: true,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "#ffffff" },
      };
      this.#chartOptions.options.scales.y = {
        display: true,
        beginAtZero: true,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "#ffffff" },
      };
      this.#chartOptions.data.datasets[0].fill = false;
      this.#chartOptions.data.datasets[0].tension = 0.2;
      this.#chartOptions.data.datasets[0].borderWidth = 2;
      this.#chartOptions.data.datasets[0].pointBackgroundColor = "#00f3ff";
      this.#chartOptions.data.datasets[0].pointBorderColor = "#ffffff";
    } else if (type === "stackedBar") {
      delete this.#chartOptions.options.scales.r;
      // Assicuriamoci di non avere indexAxis (per barre orizzontali)
      delete this.#chartOptions.options.indexAxis;
      this.#chartOptions.options.scales.x = {
        display: true,
        stacked: true,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "#ffffff" },
      };
      this.#chartOptions.options.scales.y = {
        display: true,
        stacked: true,
        beginAtZero: true,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "#ffffff" },
      };
      this.#chartOptions.data.datasets[0].borderWidth = 1;
    } else if (type === "horizontalBar") {
      delete this.#chartOptions.options.scales.r;
      // Già impostato indexAxis: "y" sopra
      this.#chartOptions.options.scales.x = {
        display: true,
        beginAtZero: true,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "#ffffff" },
      };
      this.#chartOptions.options.scales.y = {
        display: true,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "#ffffff" },
      };
    } else {
      // Barre verticali standard
      delete this.#chartOptions.options.scales.r;
      delete this.#chartOptions.options.indexAxis;
      this.#chartOptions.options.scales.x = {
        display: true,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "#ffffff" },
      };
      this.#chartOptions.options.scales.y = {
        display: true,
        beginAtZero: true,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "#ffffff" },
      };
    }
  }

  setChartOptions(title, keysArray, valuesArray, colorsArray, maxValue) {
    this.#chartOptions.options.plugins.title.text = title;
    this.#chartOptions.data.labels = keysArray;
    this.#chartOptions.data.datasets[0].data = valuesArray;
    this.#chartOptions.data.datasets[0].backgroundColor = colorsArray;

    if (this.#chartOptions.options.scales.y) {
      this.#chartOptions.options.scales.y.suggestedMax = maxValue + 1;
    }
    if (this.#chartOptions.options.scales.r) {
      this.#chartOptions.options.scales.r.suggestedMax = maxValue + 1;
    }
  }

  getChartOptions() {
    return this.#chartOptions;
  }

  setWhiteBackground(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#0f0c29";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}