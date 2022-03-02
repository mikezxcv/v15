# -*- coding: utf-8 -*-
from odoo import fields, models, api, _

class Partner(models.Model):
    _inherit = 'res.bank'

    munic_id = fields.Many2one('res.municipality', _('Municipality'),ondelete='restrict')
    
    #@api.onchange('state_id')
    def _onchange_state_id(self):
        if not self.country_id:
            self.country_id = self.state_id.country_id.id
        if self.state_id:
            return {'domain': {'munic_id': [('dpto_id', '=', self.state_id.id)]}}
        else:
            return {'domain': {'munic_id': []}}
    
    @api.onchange('munic_id')
    def _onchange_munic_id(self):
        if not self.state_id:
            self.state_id = self.munic_id.dpto_id.id
            
    