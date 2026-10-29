// CAP only picks up TypeScript handler siblings when this flag is set; jest does not set it,
// so without this a request that should be rejected would silently succeed.
process.env.CDS_TYPESCRIPT = 'true'
