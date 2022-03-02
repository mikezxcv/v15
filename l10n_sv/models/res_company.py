# -*- coding: utf-8 -*-
from odoo import fields, models, api, exceptions
class Company(models.Model):
    _inherit = 'res.company'
    
    company_registry = fields.Char(string="N.R.C.")
    giro = fields.Char(string="Giro")
    #Datos de contacto
    fax = fields.Char(string="Fax")
    pbx = fields.Char(string="PBX")
        
    @api.onchange('company_registry')
    def change_company_registry(self):
        self.partner_id.nrc = self.company_registry

    @api.onchange('giro')
    def change_giro(self):
        self.partner_id.giro = self.giro
          
    @api.onchange('pbx')
    def change_pbx(self):
        self.partner_id.pbx = self.pbx
        
    @api.onchange('fax')
    def change_fax(self):
        self.partner_id.fax = self.fax