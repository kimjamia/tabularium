export type EmployeeStatus = 'Active' | 'On Leave' | 'Contract'

export type EmployeeRow = {
  id: number
  name: string
  role: string
  status: EmployeeStatus
  salary: number
  location: string
}

export const EMPLOYEE_STATUSES: EmployeeStatus[] = ['Active', 'On Leave', 'Contract']

const SEED_ROWS: EmployeeRow[] = [
  {
    id: 1,
    name: 'Maya Patel',
    role: 'Product Manager',
    status: 'Active',
    salary: 98000,
    location: 'New York',
  },
  {
    id: 2,
    name: 'Leo Gonzalez',
    role: 'Data Analyst',
    status: 'On Leave',
    salary: 78000,
    location: 'Austin',
  },
  {
    id: 3,
    name: 'Hannah Becker',
    role: 'Engineering Lead',
    status: 'Active',
    salary: 132000,
    location: 'Berlin',
  },
  {
    id: 4,
    name: 'Marcus Li',
    role: 'Solutions Architect',
    status: 'Contract',
    salary: 118000,
    location: 'Singapore',
  },
  {
    id: 5,
    name: 'Nora Watts',
    role: 'Success Manager',
    status: 'Active',
    salary: 86000,
    location: 'Remote',
  },
]

const LATENCY_MIN_MS = 500
const LATENCY_MAX_MS = 900

export class FakeEmployeeApi {
  private rows: EmployeeRow[]

  private lastId: number

  constructor(seed: EmployeeRow[] = SEED_ROWS) {
    this.rows = seed.map((row) => ({ ...row }))
    this.lastId = this.rows.reduce((max, row) => Math.max(max, row.id), 0)
  }

  async listRows(): Promise<EmployeeRow[]> {
    await this.simulateLatency()
    return this.rows.map((row) => ({ ...row }))
  }

  async createRow(partial: Partial<EmployeeRow> = {}): Promise<EmployeeRow> {
    await this.simulateLatency()
    const row: EmployeeRow = {
      id: this.nextId(),
      name: partial.name ?? 'New hire',
      role: partial.role ?? 'Generalist',
      status: partial.status ?? 'Active',
      salary: typeof partial.salary === 'number' ? partial.salary : 65000,
      location: partial.location ?? 'Remote',
    }

    this.rows.push(row)
    return { ...row }
  }

  async updateCell<K extends keyof EmployeeRow>(id: number, columnKey: K, value: EmployeeRow[K]): Promise<EmployeeRow> {
    await this.simulateLatency()
    const target = this.rows.find((row) => row.id === id)

    if (!target) {
      throw new Error(`Row with id ${id} was not found`)
    }

    if (columnKey === 'id') {
      throw new Error('The id column is read-only')
    }

    target[columnKey] = value
    return { ...target }
  }

  async deleteRow(id: number): Promise<EmployeeRow> {
    await this.simulateLatency()
    const index = this.rows.findIndex((row) => row.id === id)

    if (index === -1) {
      throw new Error(`Row with id ${id} was not found`)
    }

    const [removed] = this.rows.splice(index, 1)
    return { ...removed }
  }

  private nextId(): number {
    this.lastId += 1
    return this.lastId
  }

  private simulateLatency(): Promise<void> {
    const duration = LATENCY_MIN_MS + Math.floor(Math.random() * (LATENCY_MAX_MS - LATENCY_MIN_MS + 1))
    return new Promise((resolve) => {
      setTimeout(resolve, duration)
    })
  }
}
