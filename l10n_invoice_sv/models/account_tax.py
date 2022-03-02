# -*- coding: utf-8 -*-
from odoo import api, fields, models, _, exceptions

class AccountTax(models.Model):
    _inherit = 'account.tax'
    
    type_tax = fields.Selection([
            ('iva_venta','IVA 13% Venta'),
            ('iva_compra','IVA 13% Compra'),
            ('exento','Exentas'),
            ('no_sujeto', 'No Sujetas'),
            ('exportacion','Exportacion'),
            ('retencion','Retencion 1%'),
            ('percepcion1','Percepcion 1%'),
            ('percepcion2','Percepcion 2%'),
            ('importacionE','Importaciones Exentas'),
            ('importacionG','Importaciones Gravadas'),
            ('excluidos','Excluidos'),
            ('na', 'No Aplica'),
        ], string="Tipo de Impuesto", index=True, default=False)

