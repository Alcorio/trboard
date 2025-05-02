// import dayjs from "dayjs";

// export default function DateCell({ value }) {
//   if (!value) return null;
//   return <span>{dayjs(value).format("YYYY/MM/DD HH:mm:ss")}</span>;
// }
'use client'

import { useEffect, useState } from "react";
import dayjs from "dayjs";

export default function DateCell({ value }) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    if (value) {
      // console.log(`[DateCell] 原始传入 value:`, value);

      // 去掉最后的 Z，不让 dayjs 识别成 UTC 
      const localValue = value.endsWith('Z') ? value.slice(0, -1) : value;
      
      const formattedTime = dayjs(localValue).format("YYYY/MM/DD HH:mm:ss");

      //console.log(`[DateCell] 修正后 value:`, localValue);
      //console.log(`[DateCell] 格式化后显示:`, formattedTime);

      setFormatted(formattedTime);
    }
  }, [value]);

  return <span>{formatted}</span>;
}


