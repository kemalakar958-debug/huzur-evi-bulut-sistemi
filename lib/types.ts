export type Facility={id:string;name:string;code:string};
export type Patient={id:string;facility_id:string;full_name:string;tc_no?:string;floor_no?:string;room_no?:string;bed_no?:string;alarm_no?:string;relative_name?:string;relative_phone?:string;doctor_name?:string;allergies?:string;diagnoses?:string;status?:string};
export type Medication={id:string;facility_id:string;patient_id:string;drug_name:string;daily_use:string;stock:number;min_stock:number;rx_date?:string;exp_date?:string;status:'active'|'stopped'};
export type DepotItem={id:string;facility_id:string;name:string;barcode?:string;category?:string;shelf?:string;lot_no?:string;exp_date?:string;current_stock:number;min_stock:number;max_stock:number};
export type StockRequest={id:string;facility_id:string;product_name:string;category?:string;current_stock:number;requested_qty:number;min_stock:number;priority:string;status:string;approval_status:string};
