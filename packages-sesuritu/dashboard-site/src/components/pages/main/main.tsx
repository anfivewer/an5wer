import {observer} from 'mobx-react-lite';
import React, {FC, ReactNode, useMemo} from 'react';
import {useMainMst} from '../../../contexts/main';
import styles from './main.module.css';
import {ReportType} from '@-/sesuritu-types/src/site/report/report';
import {SimpleTimeMetric} from '../../simple-time-metric/simple-time-metric';

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
        default: {
          const shouldBeNever: never = report.type;
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
