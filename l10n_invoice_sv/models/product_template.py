# -*- coding: utf-8 -*-

from odoo import api, fields, models, _

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    arancel_id = fields.Many2one('posicion.arancel','Tariff',track_visibility='onchange')
    arancel = fields.Float('% Tarriff', digits=(5,4), related='arancel_id.porcentaje', readonly=True)
    description_arancel = fields.Text('Description of Tariff', related='arancel_id.description', readonly=True)

class PosicionArancelaria(models.Model):
    _inherit = 'posicion.arancel'

    product_ids = fields.One2many('product.template', 'arancel_id', 'Productos', readonly=True)
