using { hotel } from '../db/schema';
using { hotel.analytics } from '../db/analytics';

service HotelService @(path: '/hotel') {

  @cds.redirection.target
  entity Bookings  as projection on hotel.Bookings;
  entity Guests    as projection on hotel.Guests;
  entity Rooms     as projection on hotel.Rooms;
  entity Charges   as projection on hotel.Charges;

  @cds.redirection.target
  entity Incidents as projection on hotel.Incidents;

  @readonly entity MonthlyTargets as projection on hotel.MonthlyTargets;

  // code lists, used as value helps and for display
  @readonly entity Species         as projection on hotel.Species;
  @readonly entity BookingStatuses as projection on hotel.BookingStatuses;
  @readonly entity IncidentTypes   as projection on hotel.IncidentTypes;
  @readonly entity Extras          as projection on hotel.Extras;

  // analytics
  @readonly entity RevenueByPeriod    as projection on analytics.RevenueByPeriod;
  @readonly entity RevenueVsTarget    as projection on analytics.RevenueVsTarget;
  @readonly entity IncidentsBySpecies as projection on analytics.IncidentsBySpecies;
  @readonly entity RoomRanking        as projection on analytics.RoomRanking;
}
