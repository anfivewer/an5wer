type I18nDefinition<Keys extends string> = {
  [Key in Keys]: {
    en: string;
  };
};

const currentLang = 'en';

export const i18nFactory = <Keys extends string>(
  definition: I18nDefinition<Keys>,
) => {
  return (key: Keys): string => {
    return definition[key][currentLang];
  };
};
