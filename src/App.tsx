import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './App.css'

function App() {
  const [count, setCount] = useState(0);
  const [startingCharge, setStartingCharge] = useState(0);
  const [usedMileage, setUsedMilage] = useState(0);
  const [totalSuccess, setTotalSuccess] = useState(2);

  const bonusTicket = [70, 130, 150, 170, 270, 330, 350, 370].map((e) => e - usedMileage).filter((e) => e > 0);

  const generateDistribution = (charge: number = 0) => {
    let cumulative: Array<number> = [];
    let exact: Array<number> = [];
    const PITY = 200;
    const HALF_PITY = PITY/2;
    const HALF_PITY_RATE = 0.5;
    const RATE = 0.007;
    for (let i = charge; i < PITY; i++) {
      /**
       * The probability of getting it on the `i`th roll
       * is the `RATE` (or modified) multiplied by the probability of
       * _not_ having gotten it on any of the previous rolls
       */
      if (i === HALF_PITY - 1) {
        exact[i - charge] = (1 - (cumulative[i-charge-1] ?? 0)) * HALF_PITY_RATE;
      } else if (i === PITY - 1) {
        exact[i - charge] = (1 - (cumulative[i-charge-1] ?? 0 )) * 1;
      } else {
        exact[i - charge] = (1 - (cumulative[i-charge-1] ?? 0)) * RATE;
      }
      cumulative[i - charge] = exact[i-charge] + (cumulative[i-charge-1] ?? 0);
    }
    return {
      cumulative: cumulative,
      exact: exact
    }
  }
  
  const convolute = (dist_1: Array<number>, dist_2: Array <number>) => {
    let cumulative: Array<number> = [];
    let exact: Array<number> = [];
    for (let i = 0; i < dist_1.length + dist_2.length; i++) {
      exact[i] = 0;
      for (let x = 0; x < i; x++) {
        exact[i] += (dist_1[x] ?? 0) * (dist_2[i-x-1] ?? 0);
      }
      cumulative[i] = (cumulative[i-1] ?? 0) + exact[i];
    }
    return {
      cumulative: cumulative,
      exact: exact
    };
  };

  const convoluteX = (distribution: Array<number>, iterations: number = 0, altDistribution: Array<number>|null = null) => {
    if (altDistribution === null) {
      altDistribution = distribution;
    }
    if (iterations < 1) {
      return null;
    }
    for (let i = 0; i < iterations - 1; i++) {
      distribution = convolute(distribution, distribution).exact;
    }
    return convolute( altDistribution, distribution );
  }

  const single = generateDistribution();
  const singlePlusCharge = generateDistribution(startingCharge);

  let probability = convoluteX(single.exact, totalSuccess - 1, singlePlusCharge.exact) ?? single;
  for (let i = 0, x = 0; i < probability.cumulative.length; i++) {
    if (i === bonusTicket[x] - 1) {
      probability.cumulative[i] = probability.cumulative[bonusTicket[x] + 10] ?? 1;
      x++;
    }
  }
  bonusTicket.forEach((i, j) => {
    probability.cumulative.splice(i - (10 * j), 10)
  })
  
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    stacked: false,
    plugins: {
      title: {
        display: true,
        text: 'Cumalative Probability',
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: "Probability",
        }
      },
      x: {
        type: 'linear' as const,
        display: true,
        max: probability.cumulative.length,
        position: 'bottom' as const,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: "Paid Pulls",
        }
      },
    },
  };

  const labels = Array.from({length: probability.cumulative.length}, (_, i) => i+1);

  const data = {
    labels,
    datasets: [
      {
        label: 'Probability',
        data: probability.cumulative,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y',
        pointRadius: 1,
        pointBorderWidth: 0
      },
      // {
      //   label: 'Dataset 2',
      //   data: [1, 2, 3, 4, 5, 6],
      //   borderColor: 'rgb(53, 162, 235)',
      //   backgroundColor: 'rgba(53, 162, 235, 0.5)',
      //   yAxisID: 'y1',
      // },
    ],
  };
  console.log(probability.cumulative)
  
  return (
    <>
      <section id="centre">
        <div>
          Graph
          <Line options={options} data={data} />
        </div>
        <div>
          <label>Rate Ups Desired: {totalSuccess}</label>
          <input
            type="range"
            min="1"
            max="10"
            value={totalSuccess}
            onChange={(e) => setTotalSuccess(parseInt(e.target.value))}
          />
          <label>Starting Charge: {startingCharge}</label>
          <input
            type="range"
            min="0"
            max="199"
            value={startingCharge}
            onChange={(e) => setStartingCharge(parseInt(e.target.value))}
          />
          <label>Used Milage: {usedMileage}</label>
          <input
            type="range"
            min="0"
            max="199"
            value={usedMileage}
            onChange={(e) => setUsedMilage(parseInt(e.target.value))}
          />
        </div>
      </section>

    </>
  )
}

export default App
