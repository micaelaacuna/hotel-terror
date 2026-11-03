using { hotel } from '../db/schema';
using { hotel.analytics } from '../db/analytics';

service HotelService @(path: '/hotel', requires: 'authenticated-user') {

  @odata.draft.enabled
  @cds.redirection.target
  entity Bookings  as projection on hotel.Bookings actions {
    action checkIn();
    action checkOut();
    action cancel();
  };

  @odata.draft.enabled
  entity Guests    as projection on hotel.Guests;

  @odata.draft.enabled
  entity Rooms     as projection on hotel.Rooms;

  entity Charges   as projection on hotel.Charges;

  @cds.redirection.target
  entity Incidents as projection on hotel.Incidents;

  @readonly entity MonthlyTargets as projection on hotel.MonthlyTargets;

  // code lists, used as value helps and for display
  @cds.odata.valuelist
  @readonly entity Species         as projection on hotel.Species;

  @cds.odata.valuelist
  @readonly entity BookingStatuses as projection on hotel.BookingStatuses;

  @cds.odata.valuelist
  @readonly entity IncidentTypes   as projection on hotel.IncidentTypes;

  @cds.odata.valuelist
  @readonly entity Extras          as projection on hotel.Extras;

  // analytics
  @readonly entity RevenueByPeriod    as projection on analytics.RevenueByPeriod;
  @readonly entity RevenueVsTarget    as projection on analytics.RevenueVsTarget;
  @readonly entity IncidentsBySpecies as projection on analytics.IncidentsBySpecies;
  @readonly entity RoomRanking        as projection on analytics.RoomRanking;

  // dashboard reads, computed by handlers
  function occupancy(period : String(7)) returns {
    occupiedRoomNights  : Integer;
    availableRoomNights : Integer;
    rate                : Decimal(5, 2);
    target              : Decimal(5, 2);
  };

  function nextFullMoon() returns {
    date                  : Date;
    sensitiveGuestsBooked : Integer;
    surchargePct          : Integer;
  };
}

// amounts are computed by service handlers, never set by clients
annotate HotelService.Bookings with {
  period          @readonly;
  nights          @readonly;
  fullMoonNights  @readonly;
  roomAmount      @readonly;
  surchargeAmount @readonly;
  depositAmount   @readonly;
  totalAmount     @readonly;
}

annotate HotelService.Charges with {
  amount @readonly;
}
