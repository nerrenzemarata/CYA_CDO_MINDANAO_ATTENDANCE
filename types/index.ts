export type Unit = 'USTP' | 'XU' | 'Staffer' | 'UC' | 'Butuan'

export type TripStatus = 'riding' | 'not_going'

export interface Member {
  id: string
  unit: Unit
  name: string
  contact_number: string
  june4_status: TripStatus
  june7_status: TripStatus
  created_at: string
}
