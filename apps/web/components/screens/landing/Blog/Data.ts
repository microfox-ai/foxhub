import { IPublication } from "./PublicationDialog";

export interface IProjects extends IPublication {
  isHot?: boolean;
}
export interface IIndustryAndProjects {
  industry: string;
  projects: IProjects[];
}

export const projectsData: IIndustryAndProjects[] = [];
