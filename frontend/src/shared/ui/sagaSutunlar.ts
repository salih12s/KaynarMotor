// Tablonun verilen (1'den başlayan) sütunlarını sağa yaslar: başlık ve hücreler birlikte, tek yerden
export const sagaSutunlar = (...sutunlar: number[]) =>
  Object.fromEntries(sutunlar.map((n) => [`& th:nth-of-type(${n}), & td:nth-of-type(${n})`, { textAlign: 'right' as const, whiteSpace: 'nowrap' as const }]));
