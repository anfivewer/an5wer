import {
  PieTimeMetric,
  ReportType,
} from '@-/sesuritu-types/src/site/report/report';
import {increment} from '@-/util/src/object/counter-record';

type ExtractCategoryCountFn<T> = (item: T, key: string) => number;

type ExtractCategoriesFn<T> = (options: {
  item: T;
  addCategory: (key: string, count: number) => void;
}) => void;

export class PieCollector<T> {
  private name: string;
  private items: {tsMs: number; item: T}[] = [];
  private extractCategories: ExtractCategoriesFn<T>;
  private extractCategoryCount: ExtractCategoryCountFn<T>;
  private keysTotal: Record<string, number> = {};

  constructor({
    name,
    extractCategories,
    extractCategoryCount,
  }: {
    name: string;
    extractCategories: ExtractCategoriesFn<T>;
    extractCategoryCount: ExtractCategoryCountFn<T>;
  }) {
    this.name = name;
    this.extractCategories = extractCategories;
    this.extractCategoryCount = extractCategoryCount;
  }

  addItem(item: {tsMs: number; item: T}) {
    this.items.push(item);

    this.extractCategories({
      item: item.item,
      addCategory: (key, count) => {
        increment(this.keysTotal, key, count);
      },
    });
  }

  getMetric() {
    const result: PieTimeMetric = {
      type: ReportType.pieTimeMetric,
      name: this.name,
      keys: [],
      data: [],
    };

    const keysList = Object.entries(this.keysTotal);
    keysList.sort(([, a], [, b]) => b - a);

    const {keys, data} = result;

    keysList.forEach(([key]) => {
      keys.push(key);
    });

    this.items.forEach(({tsMs, item}) => {
      data.push({
        tsMs,
        values: keys.map((key) => {
          return this.extractCategoryCount(item, key);
        }),
      });
    });

    return result;
  }
}
