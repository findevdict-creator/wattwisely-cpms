/** A site an access group opens, or a driver in it, by name. */
export interface NamedRow {
  id: string;
  name: string;
}

/** One access group with the sites it opens and the drivers in it. */
export interface AccessGroupRecord {
  id: string;
  name: string;
  description: string;
  sites: NamedRow[];
  members: NamedRow[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
