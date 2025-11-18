// Zimbabwe Provinces, Regions, and Districts with helper functions

export interface ProvinceInfo {
  province: string;
  region: string | string[]; // Mashonaland East has two possible regions
  districts: string[];
}

const PROVINCES_DATA: ProvinceInfo[] = [
  {
    province: "Harare",
    region: "Northern Division",
    districts: ["Harare Urban", "Chitungwiza", "Epworth"],
  },
  {
    province: "Bulawayo",
    region: "Western Division",
    districts: ["Bulawayo Urban"],
  },
  {
    province: "Manicaland",
    region: "Eastern Division",
    districts: [
      "Buhera",
      "Chimanimani",
      "Chipinge",
      "Makoni",
      "Mutare",
      "Mutasa",
      "Nyanga",
    ],
  },
  {
    province: "Mashonaland Central",
    region: "Northern Division",
    districts: [
      "Bindura",
      "Guruve",
      "Mazowe",
      "Mbire",
      "Mount Darwin",
      "Muzarabani",
      "Rushinga",
      "Shamva",
    ],
  },
  {
    province: "Mashonaland East",
    // Special case: requires choosing one of two regions
    region: ["Northern Division", "Eastern Division"],
    districts: [
      "Chikomba",
      "Goromonzi",
      "Marondera",
      "Mudzi",
      "Murehwa",
      "Mutoko",
      "Seke",
      "Uzumba-Maramba-Pfungwe (UMP)",
      "Wedza (Hwedza)",
    ],
  },
  {
    province: "Mashonaland West",
    region: "Northern Division",
    districts: [
      "Chegutu",
      "Hurungwe",
      "Kariba",
      "Makonde",
      "Mhondoro-Ngezi",
      "Sanyati",
      "Zvimba",
    ],
  },
  {
    province: "Masvingo",
    region: "Central Division",
    districts: [
      "Bikita",
      "Chiredzi",
      "Chivi",
      "Gutu",
      "Masvingo",
      "Mwenezi",
      "Zaka",
    ],
  },
  {
    province: "Matabeleland North",
    region: "Western Division",
    districts: [
      "Binga",
      "Bubi",
      "Hwange",
      "Lupane",
      "Nkayi",
      "Tsholotsho",
      "Umguza",
    ],
  },
  {
    province: "Matabeleland South",
    region: "Western Division",
    districts: [
      "Beitbridge",
      "Bulilima",
      "Gwanda",
      "Insiza",
      "Mangwe",
      "Matobo",
      "Umzingwane",
    ],
  },
  {
    province: "Midlands",
    region: "Central Division",
    districts: [
      "Chirumhanzu",
      "Gokwe North",
      "Gokwe South",
      "Gweru",
      "Kwekwe",
      "Mberengwa",
      "Shurugwi",
      "Zvishavane",
    ],
  },
];

export const getProvinces = (): string[] =>
  PROVINCES_DATA.map((p) => p.province);

export const getDistricts = (province: string | undefined | null): string[] => {
  if (!province) return [];
  const info = PROVINCES_DATA.find((p) => p.province === province);
  return info ? info.districts : [];
};

export const needsRegionChoice = (
  province: string | undefined | null
): boolean => {
  if (!province) return false;
  const info = PROVINCES_DATA.find((p) => p.province === province);
  return Array.isArray(info?.region);
};

export const getRegion = (
  province: string | undefined | null
): string | null => {
  if (!province) return null;
  const info = PROVINCES_DATA.find((p) => p.province === province);
  if (!info) return null;
  return Array.isArray(info.region) ? null : (info.region as string);
};

export const getRegionOptions = (
  province: string | undefined | null
): string[] => {
  if (!province) return [];
  const info = PROVINCES_DATA.find((p) => p.province === province);
  if (!info) return [];
  return Array.isArray(info.region)
    ? (info.region as string[])
    : [info.region as string];
};

export const ZW_LOCATIONS = PROVINCES_DATA;
