export type Unit = 'USTP' | 'XU' | 'Staffer' | 'UC' | 'Butuan' | 'CYA High'

export type TripStatus = 'riding' | 'not_going'

export type BusNumber = 'Bus 1' | 'Bus 2'

export interface Member {
  id: string
  unit: Unit
  bus: BusNumber
  name: string
  contact_number: string
  june4_status: TripStatus
  june7_status: TripStatus
  created_at: string
}
