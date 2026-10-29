using { hotel } from './schema';

namespace hotel.analytics;

extend hotel.Rooms with {
  isCrypt : Boolean = (case when floor < 0 then true else false end);
}

extend hotel.Bookings with {
  balanceDue : Decimal(10, 2) = totalAmount - depositAmount;
}

entity RevenueByPeriod as select from hotel.Bookings {
  key period,
      count(*)            as stays          : Integer,
      sum(totalAmount)    as revenue        : Decimal(12, 2),
      sum(fullMoonNights) as fullMoonNights : Integer
} where status.code != 'cancelled'
  group by period;

entity RevenueVsTarget as select from hotel.MonthlyTargets as t
  left outer join RevenueByPeriod as r on r.period = t.period {
  key t.period,
      t.revenueTarget,
      coalesce(r.revenue, 0)                   as revenue   : Decimal(12, 2),
      coalesce(r.revenue, 0) - t.revenueTarget as deviation : Decimal(12, 2)
};

entity IncidentsBySpecies as select from hotel.Incidents {
  key booking.guest.species.code                    as species,
      count(*)                                      as incidents : Integer,
      sum(cost)                                      as totalCost : Decimal(12, 2),
      sum(case when resolved = false then 1 else 0 end) as openCount : Integer
} group by booking.guest.species.code;

entity RoomRanking as select from hotel.Bookings {
  key room.number                                  as room,
      room.floor                                   as floor,
      sum(totalAmount)                             as revenue  : Decimal(12, 2),
      rank() over (order by sum(totalAmount) desc) as position : Integer
} where status.code != 'cancelled'
  group by room.number, room.floor;
