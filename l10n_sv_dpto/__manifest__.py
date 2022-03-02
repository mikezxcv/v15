# -*- coding: utf-8 -*-
{
    'name': "Departamentos y Municipios de El Salvador",
    'summary': """Permite generar el reporte de Departamentos y Municipios de El Salvador""",
    'description': """
        Permite generar el reporte de  Departamentos y Municipios de El Salvador
        """,
    'author': "Intelitecsa(Francisco Trejo)",
    'website': "http://www.intelitecsa.com",
    "images": ['static/description/banner.png',
               'static/description/icon.png',
               'static/description/thumbnail.png'],
    'price': 75.00,
    'currency': 'EUR',
    'license': 'GPL-3',
    'category': 'General',
    'version': '1.2',
    'depends': ['base',
                'base_sv'],
    'data': [
        'data/res.country.state.csv',
        'data/res.municipality.csv',
        'views/res_municipality.xml',
        'views/res_partner.xml',
        'views/res_bank.xml',
        'views/res_company.xml',
        'security/ir.model.access.csv',
    ],
    'post_init_hook': 'install_dpto_sv',
}