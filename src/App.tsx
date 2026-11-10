import { useState } from 'react'
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
  const [startingCharge, setStartingCharge] = useState(0);
  const [usedMileage, setUsedMilage] = useState(0);
  const [totalSuccess, setTotalSuccess] = useState(2);
  
  const [showSparkSystem, setShowSparkSystem] = useState(false);

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
    let newDistribution = distribution;
    for (let i = 0; i < iterations - 1; i++) {
      newDistribution = convolute(newDistribution, distribution).exact;
    }
    return convolute( altDistribution, newDistribution );
  }

  const binomialTail = (trials: number, minimum: number) => {
    const RATE = 0.007;
    if (minimum <= 0) {
      return 1;
    }
    if (minimum > trials) {
      return 0;
    }
    const q = 1 - RATE;
    let term = Math.pow(q, trials);
    let below = term;
    for (let successes = 1; successes < minimum; successes += 1) {
      term *= ((trials - successes + 1) / successes) * (RATE / q);
      below += term;
    }
    return 1 - below;
  }

  const cumulativeBinomialTail = (success: number) => {
    const SPARK = 200;
    let result: Array<number> = [];
    for (let i = 0; i < success * SPARK - 1; i++) {
      result[i] = binomialTail(i+1, success - Math.floor(i/SPARK))
    }
    result[success * SPARK - 1] = 1;
    return result;
  }

  const single = generateDistribution();
  const singlePlusCharge = generateDistribution(startingCharge);

  let probability = convoluteX(single.exact, totalSuccess - 1, singlePlusCharge.exact) ?? singlePlusCharge;
  for (let i = 0, x = 0; i < probability.cumulative.length; i++) {
    if (i === bonusTicket[x] - 1) {
      probability.cumulative[i] = probability.cumulative[bonusTicket[x] + 10 - 1] ?? 1;
      x++;
    }
  }
  bonusTicket.forEach((i, j) => {
    probability.cumulative.splice(i - (10 * j), 10)
  })

  const oldSystemProbability = showSparkSystem ? cumulativeBinomialTail(totalSuccess) : null;
  if (oldSystemProbability) {
    probability.cumulative.push(...(Array.from({length: oldSystemProbability.length - probability.cumulative.length}, () => 1)))
  }
  
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
        text: `Probability of ${totalSuccess} rate ups with ${startingCharge} starting charge and ${usedMileage} consumed mileage`,
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
        },
        ticks: {
          format: { maximumFractionDigits: 5, minimumFractionDigits: 5 }
        },
        max: 1
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

  const data = {
    labels: Array.from({length: probability.cumulative.length}, (_, i) => i+1),
    datasets: [
      {
        label: oldSystemProbability ? 'Charge System' : 'Probability',
        data: probability.cumulative,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y',
        pointRadius: 1,
        pointBorderWidth: 0
      },
      ...(oldSystemProbability ? [{
        label: 'Spark System',
        data: oldSystemProbability,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y',
        pointRadius: 1,
        pointBorderWidth: 0
      }] : []),
    ],
  };
  
  return (
    <>
      <section id="center">
        <h1>BA gacha probability</h1>
        <div>
          <Line options={options} data={data} />
        </div>
        <div className="controls">
          <span className="control">
            <label>Rate Ups Desired: </label>
            <input
              type="number"
              min="1"
              max="10"
              value={totalSuccess}
              onChange={(e) => setTotalSuccess(parseInt(e.target.value))}
            />
            <input
              type="range"
              min="1"
              max="10"
              value={totalSuccess}
              onChange={(e) => setTotalSuccess(parseInt(e.target.value))}
            />
          </span>
          <span className="control">
            <label>Starting Charge: </label>
            <input
              type="number"
              min="1"
              max="199"
              value={startingCharge}
              onChange={(e) => setStartingCharge(parseInt(e.target.value))}
            />
            <input
              type="range"
              min="0"
              max="199"
              value={startingCharge}
              onChange={(e) => setStartingCharge(parseInt(e.target.value))}
            />
          </span>
          <span className="control">
            <label>Used Milage: </label>
            <input
              type="number"
              min="1"
              max="400"
              value={usedMileage}
              onChange={(e) => setUsedMilage(parseInt(e.target.value))}
            />
            <input
              type="range"
              min="0"
              max="400"
              value={usedMileage}
              onChange={(e) => setUsedMilage(parseInt(e.target.value))}
            />
          </span>
        </div>
        <div className="controls">
          <span className="control">
            <label>Show Spark System: </label>
            <input
              type="checkbox"
              value={showSparkSystem.toString()}
              onChange={(e) => setShowSparkSystem(e.target.checked)}
            />
          </span>
        </div>
      </section>
    </>
  )
}

export default App
