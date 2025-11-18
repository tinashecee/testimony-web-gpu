export interface Courtroom {
  id: string
  name: string
}

export interface Court {
  id: string
  name: string
  courtrooms: Courtroom[]
}

export interface Recording {
  id: string
  title: string
  date: string
  caseNumber: string
  duration: string
  size: string
}

export interface TableFilters {
  search: string
  dateRange: {
    start: string
    end: string
  }
  itemsPerPage: number
}

