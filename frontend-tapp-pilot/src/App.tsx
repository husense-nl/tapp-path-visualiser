import { ApexOptions } from 'apexcharts';
import React, { useEffect, useRef, useState } from 'react';
import Chart from 'react-apexcharts';
import './App.css';
import { ChartLineItem, PathItem } from './types';
import { ClipLoader } from 'react-spinners';

const initialChartData: ChartLineItem[] = [
  {
    color: 'red',
    data: [
      { x: -100, y: 0 }, { x: 100, y: 0 },
      { x: 0, y: -100 }, { x: 0, y: 100 },
    ]
  },
  // {
  //   color: 'red',
  //   data: [
  //     { x: 13.1, y: 0 }, { x: 13.1, y: 100 },
  //   ]
  // },
]

const chartOptions: ApexOptions = {
  chart: {
    type: "line",
    toolbar: { show: false },
    zoom: { enabled: false },
    selection: { enabled: false, },
  },
  xaxis: {
    type: "numeric",
    min: -3,
    max: 33,
    labels: { show: false },
    axisBorder: {
      show: false,
      color: 'red',
    },
    axisTicks: { show: false },
  },
  yaxis: {
    min: -10,
    max: 44,
    labels: { show: false },
    axisBorder: { color: "red", show: false },
    axisTicks: { show: false },
  },
  grid: { show: false },
  dataLabels: { enabled: false },
  stroke: { width: 1 },
  markers: {},
  tooltip: { enabled: false },
  legend: { show: false },
};

type TypedData = {
  cycling: ChartLineItem[],
  walking: ChartLineItem[],
  running: ChartLineItem[],
}

function App() {
  const [dates, setDates] = useState<string[]>([]);
  const [chartData, setChartData] = useState<ChartLineItem[]>([]);
  const [typedData, setTypedData] = useState<TypedData>({
    cycling: [],
    walking: [],
    running: [],
  })
  const [sliderValue, setSliderValue] = useState(0);
  const timeoutId = useRef<any>(null);
  const [filters, setFilters] = useState({
    running: true,
    walking: true,
    cycling: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/data/dates.json')
      .then(r => r.json())
      .then(setDates)
  }, [])

  useEffect(() => {

    const newChartData: ChartLineItem[] = [
      ...initialChartData,
    ]

    if (filters.walking) {
      newChartData.push(...typedData.walking);
    }
    if (filters.cycling) {
      newChartData.push(...typedData.cycling);
    }
    if (filters.running) {
      newChartData.push(...typedData.running);
    }

    setChartData(newChartData);
    setLoading(false);

  }, [filters, typedData]);

  useEffect(() => {

    if (!dates.length) {
      return
    }

    if (timeoutId.current) {
      clearTimeout(timeoutId.current)
    }

    timeoutId.current = setTimeout(async () => {

      setLoading(true);
      const date = dates[sliderValue];
      const [rawCycling, rawRunning, rawWalking] = await Promise.all([
        safeImport(`/data/cycling/${date}.json`),
        safeImport(`/data/running/${date}.json`),
        safeImport(`/data/walking/${date}.json`),
      ]);

      setTypedData({
        cycling: rawCycling.map((item): ChartLineItem => ({
          color: '#21b0fe',
          data: item.path.map((p) => ({ x: p[0], y: p[1] }))
        })),
        walking: rawWalking.map((item): ChartLineItem => ({
          color: '#fe218b',
          data: item.path.map((p) => ({ x: p[0], y: p[1] }))
        })),
        running: rawRunning.map((item): ChartLineItem => ({
          color: '#fed700',
          data: item.path.map((p) => ({ x: p[0], y: p[1] }))
        }))
      })

    }, 1000);

  }, [sliderValue, dates])

  const onFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    const key = e.target.id;
    setFilters((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div className="container">
      <div className="panel">
        <div className="slider-container">
          <div className="date">
            {`Date: ${dates[sliderValue]}`}
          </div>
          <input
            type="range"
            min={0}
            max={dates.length - 1}
            value={sliderValue}
            onChange={(e) => setSliderValue(+e.target.value)}
            className="slider"
          />
        </div>
        <div className="filters-container">
          <div className="filter-item">
            <input
              type="checkbox"
              id="walking"
              onChange={onFilterChange}
              checked={filters.walking}
            />
            <span className='walk'>Walking</span>
          </div>
          <div className="filter-item">
            <input
              type="checkbox"
              id="cycling"
              onChange={onFilterChange}
              checked={filters.cycling}
            />
            <span className='cycle'>Cycling</span>
          </div>
          <div className="filter-item">
            <input
              type="checkbox"
              id="running"
              onChange={onFilterChange}
              checked={filters.running}
            />
            <span className='run'>Running</span>
          </div>
        </div>
        <div className="loader-container">
          <ClipLoader loading={loading} />
        </div>
      </div>
      <div className="chart-container">
        <div className="chart">
          <Chart
            options={chartOptions}
            series={chartData}
            type="line"
            height="1195px"
            width="735px"
          />
        </div>
        <img src="/bg.png" alt="bg" className="bg" />
      </div>
    </div>
  );

}

async function safeImport(path: string): Promise<PathItem[]> {
  let data = [];
  try {
    data = await fetch(path).then(r => r.json());
  } catch (error) { }
  return data;
}

export default App;
