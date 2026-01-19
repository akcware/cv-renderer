// JSON Resume Schema Types
export interface CVBasics {
  name: string;
  label?: string;
  image?: string;
  email?: string;
  phone?: string;
  url?: string;
  summary?: string;
  location?: {
    address?: string;
    postalCode?: string;
    city?: string;
    countryCode?: string;
    region?: string;
  };
  profiles?: Array<{
    network: string;
    username: string;
    url: string;
  }>;
}

export interface CVWork {
  name?: string;
  position?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
}

export interface CVEducation {
  institution?: string;
  url?: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  score?: string;
  courses?: string[];
}

export interface CVSkill {
  name?: string;
  level?: string;
  keywords?: string[];
}

export interface CVProject {
  name?: string;
  description?: string;
  highlights?: string[];
  keywords?: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
  roles?: string[];
  entity?: string;
  type?: string;
}

export interface CVData {
  basics?: CVBasics;
  work?: CVWork[];
  education?: CVEducation[];
  skills?: CVSkill[];
  projects?: CVProject[];
  volunteer?: Array<{
    organization?: string;
    position?: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
  }>;
  awards?: Array<{
    title?: string;
    date?: string;
    awarder?: string;
    summary?: string;
  }>;
  publications?: Array<{
    name?: string;
    publisher?: string;
    releaseDate?: string;
    url?: string;
    summary?: string;
  }>;
  languages?: Array<{
    language?: string;
    fluency?: string;
  }>;
  interests?: Array<{
    name?: string;
    keywords?: string[];
  }>;
  references?: Array<{
    name?: string;
    reference?: string;
  }>;
  meta?: {
    canonical?: string;
    version?: string;
    lastModified?: string;
  };
}

// CV Metadata
export interface CVMetadata {
  name: string;
  path: string;
  fullPath: string;
  displayName: string;
}

// Renderer Options
export interface RenderOptions {
  outputDir?: string;
  theme?: string;
  format?: 'html' | 'pdf' | 'both';
}

// CLI Command Results
export interface BuildResult {
  success: boolean;
  cvName: string;
  htmlPath?: string;
  pdfPath?: string;
  error?: string;
}

export interface ListResult {
  cvs: CVMetadata[];
}
