import {observer} from 'mobx-react-lite';
import React, {FC, ReactNode, useMemo} from 'react';
import {useMainMst} from '../../../contexts/main';
import styles from './main.module.css';
import {ReportType} from '@-/sesuritu-types/src/site/report/report';
import {SimpleTimeMetric} from '../../simple-time-metric/simple-time-metric';
import {PieTimeMetric} from '../../pie-time-metric/pie-time-metric';
import {PercentileMetric} from '../../percentile-metric/percentile-metric';

const MainPage: FC = () => {
  const store = useMainMst();
  const {
    serverState: {report},
  } = store;

  const cards = useMemo(() => {
    const result: ReactNode[] = [];

    if (!report?.reports) {
      return result;
    }

    report.reports.forEach((report) => {
      switch (report.type) {
        case ReportType.simpleTimeMetric:
          result.push(<SimpleTimeMetric key={report.name} metric={report} />);
          break;
        case ReportType.pieTimeMetric:
          result.push(<PieTimeMetric key={report.name} metric={report} />);
          break;
        case ReportType.percentileMetric:
          result.push(<PercentileMetric key={report.name} metric={report} />);
          break;
        default: {
          const shouldBeNever: never = report;
          break;
        }
      }
    });

    return result;
  }, [report]);

  return <div className={styles.cards}>{cards}</div>;
};

const MainPageWrapped = observer(MainPage);
export {MainPageWrapped as MainPage};
