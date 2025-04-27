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
      setFormatted(dayjs(value).format("YYYY/MM/DD HH:mm:ss"));
    }
  }, [value]);

  return <span>{formatted}</span>;
}

