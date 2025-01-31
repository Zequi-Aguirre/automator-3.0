// import moment from 'moment-timezone';
// import { Lead } from '../types/leadTypes';
// import { transactionStatus } from '../config/constants';
//
// export function isReassignable(lead: Lead) {
//     if (!lead.buyer_leads!.length) return true;
//
//     return lead.buyer_leads!.every((buyerLead) => {
//         // If buyerLead is not buyer_confirmed or has no sent_date, it is reassignable
//         if (!buyerLead.buyer_confirmed || !buyerLead.sent_date) {
//             return true;
//         }
//
//         // Parse the sent_date using Moment.js
//         const sentDate = moment(buyerLead.sent_date);
//         const currentDate = moment();
//
//         // If buyerLead is buyer_confirmed and sent_date is in the future, it is reassignable
//         return sentDate.isAfter(currentDate);
//     });
// }
//
// export function getTransactionStatus(lead: Lead): string {
//     if (!lead.buyer_leads!.length) return '';
//
//     const disputes = lead.buyer_leads![0].disputes;
//
//     if (disputes && disputes.length > 0) {
//         // Check if any dispute has the status 'Pending'
//         if (disputes.some(dispute => dispute.status === 'Pending')) {
//             return transactionStatus.DISPUTE_PENDING;
//         }
//         // Check if any dispute has the status 'Approved' and if the transactions array is empty
//         if (disputes.some(dispute => dispute.status === 'Approved') && lead.buyer_leads!.some(buyerLead => buyerLead.transactions?.length === 0)) {
//             return transactionStatus.DISPUTE_APPROVED;
//         }
//     }
//
//     if (lead.buyer_leads!.some(buyerLead => buyerLead.transactions?.length === 0)) return transactionStatus.PENDING;
//     if (lead.buyer_leads![0].transactions?.some(transaction => transaction.type === 'return')) return transactionStatus.REFUNDED;
//     return transactionStatus.CHARGED;
// }