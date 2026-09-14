export const COORDENADAS_DISTRITOS: Record<string, [number, number]> = {
  "Aveiro": [40.6405, -8.6538],
  "Beja": [38.0154, -7.8654],
  "Braga": [41.5518, -8.4229],
  "Bragança": [41.8057, -6.7573],
  "Castelo Branco": [39.8226, -7.4934],
  "Coimbra": [40.2111, -8.4293],
  "Évora": [38.5667, -7.9097],
  "Faro": [37.0194, -7.9304],
  "Guarda": [40.5373, -7.2680],
  "Leiria": [39.7437, -8.8071],
  "Lisboa": [38.7223, -9.1393],
  "Madeira (Funchal)": [32.6669, -16.9241],
  "Portalegre": [39.2967, -7.4284],
  "Porto": [41.1579, -8.6291],
  "Santarém": [39.2362, -8.6857],
  "Setúbal": [38.5244, -8.8882],
  "Viana do Castelo": [41.6946, -8.8343],
  "Vila Real": [41.3006, -7.7441],
  "Viseu": [40.6610, -7.9097],
  "Açores (Ponta Delgada)": [37.7412, -25.6756],
};

export const COORDENADAS_CONCELHOS: Record<string, [number, number]> = {
  // Faro
  "Cabanas de Tavira": [37.1397, -7.6061],
  "Tavira": [37.1273, -7.6489],
  "Loulé": [37.1380, -8.0234],
  "Albufeira": [37.0883, -8.2528],
  "Lagos": [37.1020, -8.6730],
  "Silves": [37.1878, -8.4384],
  "Olhão": [37.0263, -7.7949],
  "Faro": [37.0194, -7.9304],
  "São Brás de Alportel": [37.1497, -7.8830],
  "Vila Real de Santo António": [37.1937, -7.4161],
  "Castro Marim": [37.2169, -7.4438],
  "Alcoutim": [37.4736, -7.4736],
  "Aljezur": [37.3178, -8.7998],
  "Lagoa": [37.1347, -8.4536],
  "Monchique": [37.3167, -8.5667],
  "Vila do Bispo": [37.0833, -8.9167],
  // Lisboa
  "Lisboa": [38.7223, -9.1393],
  "Sintra": [38.7972, -9.3905],
  "Cascais": [38.6979, -9.4215],
  "Oeiras": [38.6972, -9.2819],
  "Amadora": [38.7538, -9.2399],
  "Loures": [38.8309, -9.1685],
  "Mafra": [38.9377, -9.3278],
  "Torres Vedras": [39.0911, -9.2578],
  "Alenquer": [39.0539, -9.0083],
  "Arruda dos Vinhos": [38.9794, -9.0775],
  "Azambuja": [39.0686, -8.8681],
  "Cadaval": [39.2439, -9.1031],
  "Lourinhã": [39.2431, -9.3128],
  "Sobral de Monte Agraço": [38.9997, -9.1536],
  "Vila Franca de Xira": [38.9547, -8.9897],
  // Porto
  "Porto": [41.1579, -8.6291],
  "Vila Nova de Gaia": [41.1239, -8.6119],
  "Matosinhos": [41.1822, -8.6895],
  "Maia": [41.2279, -8.6215],
  "Gondomar": [41.1382, -8.5322],
  "Valongo": [41.1888, -8.4986],
  "Paredes": [41.2050, -8.3286],
  "Penafiel": [41.2084, -8.2828],
  "Paços de Ferreira": [41.2786, -8.3764],
  "Felgueiras": [41.3764, -8.1931],
  "Lousada": [41.2774, -8.2828],
  "Santo Tirso": [41.3431, -8.4778],
  "Trofa": [41.3406, -8.5586],
  "Vila do Conde": [41.3544, -8.7472],
  "Amarante": [41.2719, -8.0825],
  "Baião": [41.1606, -7.9989],
  "Póvoa de Lanhoso": [41.5769, -8.2689],
  // Braga
  "Braga": [41.5518, -8.4229],
  "Guimarães": [41.4425, -8.2918],
  "Famalicão": [41.4079, -8.5196],
  "Barcelos": [41.5388, -8.6151],
  // Setúbal
  "Setúbal": [38.5244, -8.8882],
  "Almada": [38.6804, -9.1585],
  "Seixal": [38.6433, -9.1028],
  "Barreiro": [38.6633, -9.0733],
  "Sesimbra": [38.4444, -9.1014],
  // Coimbra
  "Coimbra": [40.2111, -8.4293],
  "Figueira da Foz": [40.1508, -8.8558],
  "Cantanhede": [40.3467, -8.5942],
  // Aveiro
  "Aveiro": [40.6405, -8.6538],
  "Ílhavo": [40.6014, -8.6694],
  "Águeda": [40.5750, -8.4439],
  "Ovar": [40.8594, -8.6253],
  // Leiria
  "Leiria": [39.7437, -8.8071],
  "Caldas da Rainha": [39.4036, -9.1361],
  "Marinha Grande": [39.7486, -8.9328],
  // Santarém
  "Santarém": [39.2362, -8.6857],
  "Tomar": [39.6036, -8.4092],
  "Torres Novas": [39.4800, -8.5367],
  // Évora
  "Évora": [38.5667, -7.9097],
  "Montemor-o-Novo": [38.6453, -8.2167],
  // Viseu
  "Viseu": [40.6610, -7.9097],
  "Lamego": [41.0967, -7.8103],
};

export function coordDistrito(distrito: string): [number, number] {
  return COORDENADAS_DISTRITOS[distrito] || [39.5, -8.0];
}

export function coordConcelho(concelho: string, distrito: string): [number, number] {
  if (concelho && COORDENADAS_CONCELHOS[concelho]) {
    return COORDENADAS_CONCELHOS[concelho];
  }
  return coordDistrito(distrito);
}
