import os

# Known list of op -> notebook linkages.
op_links = {
    'convert.float32': 'Ops/convert/typeConversionOps.ipynb',
    'convert.float64': 'Ops/convert/typeConversionOps.ipynb',
    'convert.int32': 'Ops/convert/typeConversionOps.ipynb',
    'convert.uint2': 'Ops/convert/typeConversionOps.ipynb',
    'convert.uint8': 'Ops/convert/typeConversionOps.ipynb',
    'morphology.thinGuoHall' : 'Ops/morphology.thin.ipynb',
    'morphology.thinHilditch' : 'Ops/morphology.thin.ipynb',
    'morphology.thinMorphological' : 'Ops/morphology.thin.ipynb',
    'morphology.thinZhangSuen' : 'Ops/morphology.thin.ipynb',
}

wip_ops = []

# Do some light processing on the ops list.
# In particular, we want global namespace ops to be listed at the top.
def globals_on_top(op):
    return '_' + op if op.rfind('.') < 0 else op

def opString(op):
    ns = namespace(op)
    opName = shortName(op)
    link = op_links.get(op, os.path.join('Ops', ns, opName + '.ipynb'))
    fullPath = os.path.join(os.getcwd(), link)
    if os.path.isfile(fullPath):
        return '* [' + op + '](' + link + ')\n'
    wip_ops.append(op)
    return ''

def namespace(op):
    dot = op.rfind('.')
    return '' if dot < 0 else op[:dot]

def shortName(op):
    return op[op.rfind('.')+1:]

def processOps(ops):
    ops.sort(key=globals_on_top)

    markdown = '# Op Table of Contents: \n## Global\n'
    last_ns = ''
    for op in ops:
        ns = namespace(op)
        if (ns != last_ns):
            last_ns = ns
            markdown += '\n## ' + ns + '\n'
        markdown += opString(op)
    
    markdown += '# Ops Coming Soon: \n## Global\n'
    last_ns = ''
    for op in wip_ops:
        ns = namespace(op)
        if (ns != last_ns):
           last_ns = ns
        markdown += ('* ' + op + "\n")
    return markdown
