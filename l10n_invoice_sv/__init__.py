# -*- coding: utf-8 -*-
from . import models
from . import wizard

from odoo import api, SUPERUSER_ID


def set_data(cr, registry):
    env = api.Environment(cr, SUPERUSER_ID, {})

    tax_obj = env['account.tax']
    tax_ids = tax_obj.search([])
    for t in tax_ids:
        if t.name == 'IVA 13%' and t.type_tax_use == 'sale':
            t.type_tax = 'iva_venta'
        if t.name == 'EXENTAS' and t.type_tax_use == 'sale':
            t.type_tax = 'exento'
        if t.name == 'IVA EXPORTACION' and t.type_tax_use == 'sale':
            t.type_tax = 'exportacion'
        if t.name == 'NO SUJETAS' and t.type_tax_use == 'sale':
            t.type_tax = 'no_sujeto'
        if t.name == 'RETENCION 1%' and t.type_tax_use == 'sale':
            t.type_tax = 'retencion'
        if t.name == 'COMPRAS EXENTAS' and t.type_tax_use == 'purchase':
            t.type_tax = 'exento'
        if t.name == 'COMPRAS NO SUJETAS' and t.type_tax_use == 'purchase':
            t.type_tax = 'no_sujeto'
        if t.name == 'IMPORTACIONES 13%' and t.type_tax_use == 'purchase':
            t.type_tax = 'importacionG'
        if t.name == 'IMPORTACION EXENTA' and t.type_tax_use == 'purchase':
            t.type_tax = 'importacionE'
        if t.name == 'PERCEPCION 1%' and t.type_tax_use == 'purchase':
            t.type_tax = 'percepcion1'
        if t.name == 'PERCEPCION 2%' and t.type_tax_use == 'purchase':
            t.type_tax = 'percepcion2'
        if t.name == 'IVA 13%' and t.type_tax_use == 'purchase':
            t.type_tax = 'iva_compra'
        if t.name == 'RETENCION 10%' and t.type_tax_use == 'purchase':
            t.type_tax = 'na'

    inv_obj = env['account.move']
    inv_ids = inv_obj.search([('move_type', '=', 'out_invoice'),
                              ('state', '=', 'paid'), ])
    for inv_id in inv_ids:
        # print(inv_id,'Id')
        refund_id = inv_obj.search([('ref', '=', 'Reversión de: ' + inv_id.number)])
        # print(refund_id,'Refun')
        if refund_id:
            refund_data = inv_obj.browse(refund_id.id)
            # print(refund_data,"Data")
            if refund_id and len(refund_id) < 2:
                # print('Se valida y asigna',refund_data.id,inv_id.inv_refund_id)
                inv_id.inv_refund_id = refund_data.id
                # print('escribimos valores')
                refund_data.write({
                    'inv_refund_id': inv_id.id,
                    'state_refund': 'refund'})

    report_ids = env['ir.actions.report'].search([('model', '=', 'account.move')])
    for i in report_ids:
        i.unlink_action()

