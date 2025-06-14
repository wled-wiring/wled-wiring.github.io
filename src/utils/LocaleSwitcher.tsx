import { useTranslation } from "react-i18next";
import { supportedLngs } from "./../i18n";

import ReactCountryFlag from "react-country-flag";

import { Select } from 'antd';

// see guide here
// https://phrase.com/blog/posts/localizing-react-apps-with-i18next/


export default function LocaleSwitcher() {
  const { i18n } = useTranslation();

  const handleChange = (value: string) => {
    //console.log(`selected ${value}`);
    i18n.changeLanguage(value);
  };
  
  return (
    <Select
      defaultValue={i18n.resolvedLanguage}
      style={{ width: 150 }}
      onChange={handleChange}
      options={Object.entries(supportedLngs).map(([code, name]) => (
        {
          value: code,
          label: <span>
                  <ReactCountryFlag
                      countryCode={code=="de"?"DE":"GB"}
                      svg
                      style={{
                          width: '1.5em',
                          height: '1.5em',
                          marginRight: 4,
                      }}
                      title={code}
                  />
                  {name}
                 </span>
        }
      ))}
      />

    /*<Form.Select
      aria-label="Select language"
      value={i18n.resolvedLanguage}
      onChange={(e) => i18n.changeLanguage(e.target.value) }
      style={{
        margin: 4
      }}
    >
      {Object.entries(supportedLngs).map(([code, name]) => (
        <option value={code} key={code}>
          {name}
        </option>
      ))}
    </Form.Select>*/
  );
}