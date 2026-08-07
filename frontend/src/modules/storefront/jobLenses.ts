export type JobLensId = "rain" | "water" | "wet" | "cut";

export type JobLens = {
  /** Set true only after catalogue metadata verifies the department mapping. */
  approvedForProduction: boolean;
  id: JobLensId;
  name: string;
  atmosphere: string;
  note: string;
  departmentSlugs: string[];
};

export const JOB_LENSES: JobLens[] = [
  {
    approvedForProduction: false,
    id: "rain",
    name: "Rain & Roofline",
    atmosphere: "roofline in heavy rain",
    note: "Everything the monsoon touches — sheets, gutters, sealants, and the pumps that move water away from the house.",
    departmentSlugs: []
  },
  {
    approvedForProduction: false,
    id: "water",
    name: "Water Supply",
    atmosphere: "pump room and pressure tank",
    note: "Pressure, storage, and the fittings that hold it together in constant heat.",
    departmentSlugs: []
  },
  {
    approvedForProduction: false,
    id: "wet",
    name: "Wet Works",
    atmosphere: "bathroom under waterproofing",
    note: "Bathrooms, kitchens, and slabs — waterproofing first, finishes second.",
    departmentSlugs: []
  },
  {
    approvedForProduction: false,
    id: "cut",
    name: "Cutting & Fixing",
    atmosphere: "cutting sheet on site",
    note: "Sizing sheet, drilling masonry, and fastening it so humidity never loosens it.",
    departmentSlugs: []
  }
];
