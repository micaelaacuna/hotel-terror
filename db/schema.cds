namespace hotel;

using { cuid, managed, sap.common.CodeList } from '@sap/cds/common';

// ---------- Code lists ----------

entity Species : CodeList {
  key code              : String(20);
      color             : String(20);  // UI5 IndicationColor name
      icon              : String(60);  // sap-icon://...
      sunTolerant       : Boolean default false;
      maxRoomTemp       : Integer;     // degrees C; null means no limit
      riskLevel         : Integer @assert.range: [1, 5];  // drives the deposit
      fullMoonSensitive : Boolean default false;
}

entity BookingStatuses : CodeList {
  key code  : String(20);
      color : String(20);
}

entity IncidentTypes : CodeList {
  key code : String(20);
      icon : String(60);
}

entity Extras : CodeList {
  key code  : String(20);
      price : Decimal(9, 2);
}

// ---------- Master data ----------

entity Rooms : managed {
  key number      : String(10);  // natural key, e.g. "C-1", "104"
      name        : String(60);
      floor       : Integer;     // negative = crypt/basement
      sunExposure : String(10) enum { none; partial; full };
      temperature : Integer;     // degrees C
      capacity    : Integer default 1;
      nightlyRate : Decimal(9, 2);
      bookings    : Association to many Bookings on bookings.room = $self;
}

entity Guests : cuid, managed {
  name            : String(100) @mandatory;
  species         : Association to Species @mandatory;
  homeRealm       : String(100);
  sourceWork      : String(150);  // literary origin
  firstAppearance : Integer;      // year of first publication
  isVip           : Boolean default false;
  bookings        : Association to many Bookings on bookings.guest = $self;
}

// ---------- Transactional ----------

entity Bookings : cuid, managed {
  guest           : Association to Guests @mandatory;
  room            : Association to Rooms  @mandatory;
  checkIn         : Date @mandatory;
  checkOut        : Date @mandatory;  // exclusive: nights = checkOut - checkIn
  status          : Association to BookingStatuses default 'confirmed';
  period          : String(7);        // 'YYYY-MM' of checkIn, set by handler
  nights          : Integer;
  fullMoonNights  : Integer;
  roomAmount      : Decimal(10, 2);
  surchargeAmount : Decimal(10, 2);
  depositAmount   : Decimal(10, 2);
  totalAmount     : Decimal(10, 2);
  charges         : Composition of many Charges   on charges.booking   = $self;
  incidents       : Composition of many Incidents on incidents.booking = $self;
}

entity Charges : cuid {
  booking  : Association to Bookings;
  extra    : Association to Extras @mandatory;
  quantity : Integer default 1;
  amount   : Decimal(10, 2);  // quantity * extra.price, set by handler
}

entity Incidents : cuid, managed {
  booking  : Association to Bookings;
  type     : Association to IncidentTypes @mandatory;
  severity : Integer @assert.range: [1, 3];  // 1 low, 2 medium, 3 high
  cost     : Decimal(10, 2) default 0;
  resolved : Boolean default false;
  note     : String(500);
}

entity MonthlyTargets {
  key period          : String(7);        // 'YYYY-MM'
      revenueTarget   : Decimal(12, 2);
      occupancyTarget : Decimal(5, 2);     // percent
}
