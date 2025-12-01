import { LeadFormInput } from "../../../../types/leadFormInputTypes.ts";

/*
    Required fields according to documentation
*/

export const REQUIRED_FIELDS: Array<keyof LeadFormInput> = [
    "form_multifamily",
    "form_repairs",
    "form_occupied",
    "form_sell_fast",
    "form_goal",
    "form_owner",
    "form_owned_years",
    "form_listed"
];

/* -------------------------------------------------------
   Type of House
------------------------------------------------------- */
export const TYPE_OF_HOUSE_OPTIONS = [
    "Ranch",
    "2-story",
    "Mobile home owned land",
    "Mobile home rented land",
    "Multifamily",
    "Single family",
    "Bungalow",
    "Cottage",
    "Townhouse",
    "Condominium",
    "Duplex",
    "Farmhouse",
    "Split-level home",
    "Land"
];

/* -------------------------------------------------------
   Repairs (multiselect)
------------------------------------------------------- */
export const REPAIRS_OPTIONS = [
    "Full Gut Renovation - Everything",
    "Remodel - Kitchen, Bathroom, Roof",
    "Cosmetic - Flooring, Paint",
    "Fully renovated and updated in past 2 years"
];

/* -------------------------------------------------------
   Square Footage (radio)
------------------------------------------------------- */
export const SQUARE_OPTIONS = [
    "0 - 500",
    "500 - 1000",
    "1000 - 2000",
    "2000 - 3000",
    "3000 - 4000",
    "4000 - 5000",
    "5000+"
];

/* -------------------------------------------------------
   Year Built Range (radio)
------------------------------------------------------- */
export const YEAR_RANGE_OPTIONS = [
    "1800-1900",
    "1900-1950",
    "1950-1970",
    "1970-1980",
    "1980-1990",
    "1990-2000",
    "2000-2010",
    "2010-2022"
];

/* -------------------------------------------------------
   Garage (radio)
------------------------------------------------------- */
export const GARAGE_OPTIONS = [
    "None",
    "1 Car Attached",
    "2 Car Attached",
    "1 Car Detached",
    "2 Car Detached",
    "Carport",
    "Other"
];

/* -------------------------------------------------------
   Bedrooms (radio)
------------------------------------------------------- */
export const BEDROOM_OPTIONS = [
    "1 Bedroom",
    "2 Bedroom",
    "3 Bedroom",
    "4 Bedroom",
    "5 Bedroom",
    "More than 5"
];

/* -------------------------------------------------------
   Bathrooms (radio)
------------------------------------------------------- */
export const BATHROOM_OPTIONS = [
    "None",
    "1 Bathroom",
    "1.5 Bathroom",
    "2 Bathroom",
    "2.5 Bathroom",
    "3 Bathroom",
    "More than 3"
];

/* -------------------------------------------------------
   Occupied (radio)
------------------------------------------------------- */
export const OCCUPIED_OPTIONS = [
    "Owner Occupied",
    "Tenant Occupied",
    "No its Vacant"
];

/* -------------------------------------------------------
   How Fast (radio)
------------------------------------------------------- */
export const SELL_FAST_OPTIONS = [
    "2-3 months",
    "1 month",
    "ASAP"
];

/* -------------------------------------------------------
   Goals (multiselect)
------------------------------------------------------- */
export const GOAL_OPTIONS = [
    "Preforeclosure",
    "Emergency Reasons",
    "Financial Reasons",
    "Selling a vacant/non-occupied property",
    "Sell and rent instead",
    "Death in the family",
    "Sell without showings",
    "Inherited Property",
    "Downsizing",
    "Tired of being a landlord",
    "Moving closer to family",
    "Relocating",
    "Retirement elsewhere",
    "Upgrading",
    "Moving from United States",
    "Behind on taxes/mortgage",
    "Old age",
    "Divorce",
    "Health issues",
    "Job loss",
    "Other personal reason"
];

/* -------------------------------------------------------
   Owner (radio)
------------------------------------------------------- */
export const OWNER_OPTIONS = [
    "Yes, i own this property",
    "Agent/wholesaler"
];

/* -------------------------------------------------------
   Owned Years (radio)
------------------------------------------------------- */
export const OWNED_YEARS_OPTIONS = [
    "0-1",
    "2-5",
    "6-9",
    "10-14",
    "15-19",
    "20-29",
    "30-50",
    "50+"
];

/* -------------------------------------------------------
   Listed (radio)
------------------------------------------------------- */
export const LISTED_OPTIONS = [
    "Yes it's listed",
    "No it's not listed"
];