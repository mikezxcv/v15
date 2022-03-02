# -*- coding: utf-8 -*-
from odoo import fields, models


class Partner(models.Model):
    _inherit = 'res.partner'
    dui = fields.Char(string="D.U.I.")
