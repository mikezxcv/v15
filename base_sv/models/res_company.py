# -*- coding: utf-8 -*-
from odoo import fields, models, api


class Company(models.Model):
    _inherit = 'res.company'

    vat = fields.Char(string="N.I.T.")
    giro = fields.Char(string="Giro")

    @api.onchange('vat')
    def change_vat(self):
        self.partner_id.vat = self.vat
